from datetime import date, datetime, timedelta

from empresas.models import ParametroLegislativo
from nomina.models import (
    Empleado,
    Eventualidad,
    PeriodoNomina,
    ReciboNomina,
    SolicitudVacacion,
)


def formatear_cop(cantidad):
    return f"${int(round(cantidad)):,}".replace(",", ".")


def formatear_fecha_corta(fecha_iso):
    if not fecha_iso:
        return "—"
    partes = str(fecha_iso).split("T")[0].split("-")
    if len(partes) != 3:
        return str(fecha_iso)
    return f"{partes[2]}/{partes[1]}/{partes[0]}"


def enmascarar_cuenta_bancaria(cuenta):
    limpia = "".join(str(cuenta).split())
    if len(limpia) <= 4:
        return f"****{limpia}"
    return f"****{limpia[-4:]}"


def enmascarar_documento(doc):
    limpio = str(doc).strip()
    if len(limpio) <= 4:
        return limpio
    return f"••••{limpio[-4:]}"


def redondear0(n):
    return int(round(n))


def calcular_dias_habiles(fecha_inicio, fecha_fin):
    if not fecha_inicio or not fecha_fin:
        return 0
    inicio = _parsear_fecha(fecha_inicio)
    fin = _parsear_fecha(fecha_fin)
    if not inicio or not fin or fin < inicio:
        return 0
    contador = 0
    cursor = inicio
    while cursor <= fin:
        if cursor.weekday() < 5:
            contador += 1
        cursor += timedelta(days=1)
    return contador


def calcular_dias_calendario_inclusive(fecha_inicio, fecha_fin):
    inicio = _parsear_fecha(fecha_inicio)
    fin = _parsear_fecha(fecha_fin)
    if not inicio or not fin or fin < inicio:
        return 0
    return (fin - inicio).days + 1


def _parsear_fecha(valor):
    if isinstance(valor, date):
        return valor
    if isinstance(valor, datetime):
        return valor.date()
    if not valor:
        return None
    try:
        return datetime.strptime(str(valor)[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def calcular_monto_horas_extra(salario_mensual, horas_extra):
    tarifa_hora = salario_mensual / 220
    total = (
        horas_extra.get("extra_diurna", 0) * tarifa_hora * 1.25
        + horas_extra.get("extra_nocturna", 0) * tarifa_hora * 1.75
        + horas_extra.get("extra_dominical_diurna", 0) * tarifa_hora * 2.0
        + horas_extra.get("extra_dominical_nocturna", 0) * tarifa_hora * 2.5
        + horas_extra.get("recargo_nocturno", 0) * tarifa_hora * 0.35
    )
    return redondear0(total)


def calcular_retefuente_colombia(ingreso_imponible_mensual, valor_uvt, umbral_uvt):
    if uvt_valor := valor_uvt <= 0 or ingreso_imponible_mensual <= 0:
        return 0
    neto_imponible = ingreso_imponible_mensual * 0.75
    monto_uvt = neto_imponible / uvt_valor
    if monto_uvt <= umbral_uvt:
        return 0
    if monto_uvt <= 150:
        impuesto_uvt = (monto_uvt - 95) * 0.19
    elif monto_uvt <= 360:
        impuesto_uvt = (monto_uvt - 150) * 0.28 + 10.45
    elif monto_uvt <= 640:
        impuesto_uvt = (monto_uvt - 360) * 0.33 + 69.25
    else:
        impuesto_uvt = (monto_uvt - 640) * 0.35 + 161.65
    return redondear0(max(0, impuesto_uvt * uvt_valor))


def obtener_dias_vacaciones_en_periodo(id_empleado, clave_periodo, vacaciones):
    partes = clave_periodo.split("-")
    anio = int(partes[0])
    mes = int(partes[1])
    inicio_periodo = date(anio, mes, 1)
    if mes == 12:
        fin_periodo = date(anio + 1, 1, 1)
    else:
        fin_periodo = date(anio, mes + 1, 1)
    total = 0
    for vac in vacaciones:
        if str(vac.empleado_id) != str(id_empleado):
            continue
        if vac.estado != "Aprobada":
            continue
        if vac.tipo == "Compensación en Dinero":
            continue
        inicio_vac = _parsear_fecha(vac.fecha_inicio)
        fin_vac = _parsear_fecha(vac.fecha_fin)
        if not inicio_vac or not fin_vac:
            continue
        inicio_superposicion = max(inicio_vac, inicio_periodo)
        fin_superposicion = min(fin_vac, fin_periodo)
        if fin_superposicion < inicio_superposicion:
            continue
        cursor = inicio_superposicion
        while cursor <= fin_superposicion:
            if cursor.weekday() < 5:
                total += 1
            cursor += timedelta(days=1)
    return total


def obtener_impacto_eventualidad_en_periodo(id_empleado, clave_periodo, eventualidades):
    bono = 0
    descuento = 0
    for ev in eventualidades:
        if str(ev.empleado_id) != str(id_empleado):
            continue
        if ev.estado == "Cerrada":
            continue
        se_sobrepone = str(ev.fecha_inicio)[:7] <= clave_periodo and str(ev.fecha_fin)[:7] >= clave_periodo
        if not se_sobrepone:
            continue
        if ev.impacto_nomina == "Bonificación":
            bono += ev.monto
        elif ev.impacto_nomina == "Descuento":
            descuento += ev.monto
    return {"bono": redondear0(bono), "descuento": redondear0(descuento)}


def construir_recibo_para_empleado(params):
    empleado = params["empleado"]
    indice = params.get("indice", 0)
    clave_periodo = params["clave_periodo"]
    etiqueta_periodo = params["etiqueta_periodo"]
    frecuencia = params["frecuencia"]
    legislacion = params["legislacion"]
    beneficios = params.get("beneficios", [])
    vacaciones = params.get("vacaciones", [])
    eventualidades = params.get("eventualidades", [])
    ajuste = params.get("ajuste") or {}
    recibo_existente = params.get("recibo_existente")
    forzar_pagado = params.get("forzar_pagado", False)

    factor = 0.5 if frecuencia == "Quincenal" else 1.0
    salario_base_periodo = redondear0(empleado.salario_base * factor)

    recibe_auxilio = empleado.salario_base <= legislacion.smmlv * 2
    auxilio_transporte = redondear0(legislacion.auxilio_transporte * factor) if recibe_auxilio else 0

    beneficios_activos = [b for b in beneficios if b.activo and str(b.id) in empleado.ids_beneficios]
    desglose_beneficios = [
        {
            "id": b.id,
            "nombre": b.nombre,
            "monto": redondear0(b.monto_mensual * factor),
            "factor_salarial": b.factor_salarial,
        }
        for b in beneficios_activos
    ]
    total_beneficios = sum(b["monto"] for b in desglose_beneficios)
    beneficios_salariales = sum(b["monto"] for b in desglose_beneficios if b["factor_salarial"])

    impacto_ev = obtener_impacto_eventualidad_en_periodo(empleado.id, clave_periodo, eventualidades)
    detalle_horas_extra = ajuste.get("horas_extra", {})
    monto_horas_extra = calcular_monto_horas_extra(empleado.salario_base, detalle_horas_extra)
    bono_desempeno = redondear0((ajuste.get("bono_desempeno", 0) or 0) + impacto_ev["bono"])
    otras_deducciones = redondear0((ajuste.get("otras_deducciones", 0) or 0) + impacto_ev["descuento"])

    pago_bruto = (
        salario_base_periodo + auxilio_transporte + monto_horas_extra + bono_desempeno + total_beneficios
    )

    ibc = salario_base_periodo + monto_horas_extra + bono_desempeno + beneficios_salariales

    deduccion_salud = redondear0(ibc * (legislacion.salud_empleado_pct / 100))
    deduccion_pension = redondear0(ibc * (legislacion.pension_empleado_pct / 100))

    deduccion_fsp = 0
    if empleado.salario_base >= legislacion.smmlv * legislacion.fsp_umbral_smmlv:
        deduccion_fsp = redondear0(ibc * (legislacion.fsp_pct / 100))

    base_equivalente_mensual = (ibc - deduccion_salud - deduccion_pension - deduccion_fsp) / factor
    retefuente_mensual = calcular_retefuente_colombia(
        base_equivalente_mensual, legislacion.uvt, legislacion.retefuente_umbral_uvt
    )
    deduccion_retefuente = redondear0(retefuente_mensual * factor)

    total_deducciones = (
        deduccion_salud + deduccion_pension + deduccion_fsp + deduccion_retefuente + otras_deducciones
    )
    pago_neto = max(0, pago_bruto - total_deducciones)

    aporte_empleador_salud = redondear0(ibc * (legislacion.salud_empleador_pct / 100))
    aporte_empleador_pension = redondear0(ibc * (legislacion.pension_empleador_pct / 100))
    tasa_arl = legislacion.arl_rates.get(str(empleado.nivel_arl), 0.522) if isinstance(legislacion.arl_rates, dict) else 0.522
    aporte_empleador_arl = redondear0(ibc * (tasa_arl / 100))
    parafiscales_total = redondear0(
        ibc * ((legislacion.caja_compensacion_pct + legislacion.sena_pct + legislacion.icbf_pct) / 100)
    )

    periodo_compacto = clave_periodo.replace("-", "")
    secuencia = str(indice + 1).zfill(3)
    numero_recibo = recibo_existente.numero_recibo if recibo_existente else f"INAM-{periodo_compacto}-{secuencia}"
    esta_pagado = forzar_pagado or (recibo_existente.estado_pago == "Pagado" if recibo_existente else False)

    return {
        "id": recibo_existente.id if recibo_existente else f"PAY-{periodo_compacto}-{empleado.id}",
        "numero_recibo": numero_recibo,
        "clave_periodo": clave_periodo,
        "etiqueta_periodo": etiqueta_periodo,
        "frecuencia": frecuencia,
        "id_empleado": empleado.id,
        "nombre_empleado": empleado.nombre_completo,
        "documento_identidad": empleado.documento_identidad,
        "cargo": empleado.cargo,
        "departamento": empleado.departamento,
        "banco": empleado.banco,
        "cuenta_bancaria_enmascarada": enmascarar_cuenta_bancaria(empleado.numero_cuenta),
        "salario_base_periodo": salario_base_periodo,
        "auxilio_transporte": auxilio_transporte,
        "monto_horas_extra": monto_horas_extra,
        "detalle_horas_extra": detalle_horas_extra,
        "bono_desempeno": bono_desempeno,
        "desglose_beneficios": desglose_beneficios,
        "total_beneficios": total_beneficios,
        "pago_bruto": pago_bruto,
        "deduccion_salud": deduccion_salud,
        "deduccion_pension": deduccion_pension,
        "deduccion_fsp": deduccion_fsp,
        "deduccion_retefuente": deduccion_retefuente,
        "otras_deducciones": otras_deducciones,
        "total_deducciones": total_deducciones,
        "pago_neto": pago_neto,
        "aporte_empleador_salud": aporte_empleador_salud,
        "aporte_empleador_pension": aporte_empleador_pension,
        "aporte_empleador_arl": aporte_empleador_arl,
        "parafiscales_total": parafiscales_total,
        "dias_vacaciones_tomados": obtener_dias_vacaciones_en_periodo(empleado.id, clave_periodo, vacaciones),
        "estado_pago": "Pagado" if esta_pagado else "Pendiente",
        "fecha_generacion": recibo_existente.fecha_generacion.isoformat() if recibo_existente else datetime.now().isoformat(),
        "fecha_pago": recibo_existente.fecha_pago.isoformat() if recibo_existente and recibo_existente.fecha_pago else (datetime.now().isoformat() if esta_pagado else None),
    }


def recalcular_periodo_borrador(periodo, empleados, beneficios, vacaciones, legislaciones, eventualidades=None):
    if eventualidades is None:
        eventualidades = []
    if periodo.estado == "Pagada":
        return periodo
    leg = next((l for l in legislaciones if l.ano == periodo.ano), legislaciones[0] if legislaciones else None)
    elegibles = [e for e in empleados if e.estado != "Retirado"]
    recibos_existentes = {r.empleado_id: r for r in periodo.recibos.all()}
    recibos_datos = []
    for indice, emp in enumerate(elegibles):
        datos = construir_recibo_para_empleado({
            "empleado": emp,
            "indice": indice,
            "clave_periodo": periodo.clave_periodo,
            "etiqueta_periodo": periodo.etiqueta,
            "frecuencia": periodo.frecuencia,
            "legislacion": leg,
            "beneficios": beneficios,
            "vacaciones": vacaciones,
            "eventualidades": eventualidades,
            "ajuste": periodo.ajustes.get(emp.id, {}),
            "recibo_existente": recibos_existentes.get(emp.id),
        })
        recibos_datos.append(datos)
    return {
        "periodo": periodo,
        "recibos": recibos_datos,
    }
