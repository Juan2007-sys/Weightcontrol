---
name: metrology-ntc2031
description: Reglas técnicas, fórmulas de Error Máximo Permitido (EMP) y validaciones de metrología legal colombiana (NTC 2031 / OIML R 76-1, Decreto 1074 de 2015).
---

# Metrología Legal Colombiana · NTC 2031 & SIMEL

Esta skill proporciona las reglas de negocio, fórmulas matemáticas de metrología legal, tolerancias de error y requisitos normativos para instrumentos de pesaje no automático (IPFNA) regulados por la Superintendencia de Industria y Comercio (SIC) y el ONAC en Colombia.

---

## 1. Categorías de Exactitud (NTC 2031 / OIML R 76-1)

| Clase de Exactitud | Designación | Escalón de Verificación ($e$) | Número de Escalones ($n = Max / e$) | Aplicación Típica |
| :--- | :--- | :--- | :--- | :--- |
| **Clase I** | Especial | $0.001\text{ g} \leq e$ | $n \geq 50.000$ | Laboratorios de investigación, metrología científica |
| **Clase II** | Fina | $0.001\text{ g} \leq e \leq 0.05\text{ g}$ | $100 \leq n \leq 100.000$ | Joyerías, laboratorios farmacéuticos |
| **Clase III** | Media | $0.1\text{ g} \leq e \leq 2\text{ g}$ ó $e \geq 5\text{ g}$ | $500 \leq n \leq 10.000$ | Balanzas comerciales, básculas camioneras, supermercados |
| **Clase IIII** | Ordinaria | $e \geq 5\text{ g}$ | $100 \leq n \leq 1.000$ | Pesaje de materiales gruesos, áridos, pesaje vial |

---

## 2. Fórmulas de Error Máximo Permitido (EMP) para Clase III

Para la verificación periódica o en servicio de básculas comerciales Clase III:

$$
\text{EMP}(\text{Carga } m) = 
\begin{cases} 
\pm 1.0\,e & \text{si } 0 \leq m \leq 500\,e \\ 
\pm 2.0\,e & \text{si } 500\,e < m \leq 2.000\,e \\ 
\pm 3.0\,e & \text{si } 2.000\,e < m \leq 10.000\,e 
\end{cases}
$$

*(Nota: En verificación inicial de fábrica o post-reparación, los límites son la mitad: $\pm 0.5e$, $\pm 1.0e$, $\pm 1.5e$).*

---

## 3. Protocolo de Ensayos Técnicos en Actas ONAC

1. **Ensayo de Excentricidad (Carga en Esquinas):**
   * Se aplica una carga de $1/3\,Max$ en las cuatro esquinas de la plataforma receptora de carga.
   * El error en cualquier esquina no debe superar el EMP correspondiente a esa carga.
2. **Ensayo de Repetibilidad:**
   * Mínimo 3 mediciones consecutivas con una carga de aproximadamente $1/2\,Max$.
   * La diferencia entre el valor máximo y mínimo registrado no debe ser superior al valor absoluto del EMP para esa carga.
3. **Ensayo de Pesaje (Linealidad Ascendente y Descendente):**
   * Mínimo 5 puntos de carga distribuidos entre $Min$, $500e$, $2000e$ y $Max$.

---

## 4. Estándares de Trazabilidad e Identificadores

* **Serial:** Formato alfanumérico único `[TIPO]-[AÑO]-[RADICADO]-[CIUDAD]` (ej. `BAL-2025-99201-BOG`).
* **Placa RUMP:** `RUMP-CO-[6 dígitos]` asignada por el Registro Único de Metrología Legal.
* **Precinto SIMEL:** `STAMP-CO-[7 dígitos]` emitido por reparadores inscritos o la SIC.
* **Estampado Cronológico:** Trazable a hora legal colombiana NIST / INM UTC-5 con hash SHA-256.
