# Festo CPX-E / CECC-X Profinet GSDML Configuration Reference

Reference extracted from the official Festo GSDML files for PLC Profinet IO configuration.

Source files:
- `GSDML-V2.32-Festo-CPX-E-CEC-20170201.xml` (CPX-E-CEC)
- `GSDML-V2.34-Festo-CECC_X-20210401.xml` (CECC-X family)

---

## 1. Device Identification

### CPX-E-CEC

| Parameter              | Value                           |
|------------------------|---------------------------------|
| VendorID               | `0x014D` (333 decimal)          |
| DeviceID               | `0x0301` (769 decimal)          |
| Vendor Name            | Festo AG & Co. KG               |
| Main Family            | PLCs                            |
| Product Family         | Festo CPX-E Controller          |
| GSDML Schema Version   | V2.32                           |
| PNIO Version           | V2.31                           |
| Description            | PROFINET IO-Device with PLC functionality |

### CECC-X

| Parameter              | Value                           |
|------------------------|---------------------------------|
| VendorID               | `0x014D` (333 decimal)          |
| DeviceID               | `0x0302` (770 decimal)          |
| Vendor Name            | Festo SE & Co. KG               |
| Main Family            | PLCs                            |
| Product Family         | CECC                            |
| GSDML Schema Version   | V2.34                           |
| PNIO Version           | V2.34                           |
| Description            | CECC-X                          |

---

## 2. Device Access Points (DAP)

### CPX-E-CEC DAP

| Parameter                    | Value                    |
|------------------------------|--------------------------|
| DAP ID                       | `DAP Rev01`              |
| Module Ident Number          | `0x01000000`             |
| Order Number                 | CPX-E-CEC                |
| DNS Compatible Name          | `CPX-E-CEC-PN`           |
| Physical Slots               | 0..16                    |
| Fixed In Slots               | 0                        |
| Conformance Class            | B                        |
| Netload Class                | III                      |
| Min Device Interval          | 32 (1 ms)                |
| Max Input Length              | 1024 bytes               |
| Max Output Length             | 1024 bytes               |
| Implementation Type          | Festo-v2                 |
| Address Assignment           | DCP                      |
| Multiple Write Supported     | Yes                      |
| Device Access Supported      | Yes                      |
| LLDP NoD Supported           | Yes                      |
| Reset To Factory Modes       | 2                        |
| Check DeviceID Allowed       | Yes                      |
| Name Of Station Transferable | No                       |

### CECC-X DAPs

O CECC-X possui 6 variantes de DAP (3 variantes de hardware x 2 gerações):

#### Geração 5 (Gen5 / original)

| Variante          | DAP ID                    | ModuleIdentNumber | Order Number | DNS Name               | HW Rev | SW Rev    |
|-------------------|---------------------------|--------------------|--------------|------------------------|--------|-----------|
| CECC-X-M1         | `DAP CECC-X-M1`           | `0x00000300`       | 4407603      | `CECC-X-M1-PN`         | 05     | V3.8.14   |
| CECC-X-M1-MV      | `DAP CECC-X-M1-MV`        | `0x00000301`       | 4407605      | `CECC-X-M1-MV-PN`      | 05     | V3.8.14   |
| CECC-X-M1-MV-S1   | `DAP CECC-X-M1-MV-S1`     | `0x00000302`       | 4407606      | `CECC-X-M1-MV-S1-PN`   | 05     | V3.8.14   |

#### Geração 4 (Gen4)

| Variante          | DAP ID                        | ModuleIdentNumber | Order Number | DNS Name                  | HW Rev | SW Rev    |
|-------------------|-------------------------------|--------------------|--------------|---------------------------|--------|-----------|
| CECC-X-M1         | `DAP CECC-X-M1 GEN4`          | `0x00000300`       | 8124922      | `CECC-X-M1-PN`            | 07     | V4.0.14   |
| CECC-X-M1-MV      | `DAP CECC-X-M1-MV GEN4`       | `0x00000301`       | 8124923      | `CECC-X-M1-MV-PN`         | 07     | V4.0.14   |
| CECC-X-M1-MV-S1   | `DAP CECC-X-M1-MV-S1 GEN4`    | `0x00000302`       | 8124924      | `CECC-X-M1-MV-S1-PN`      | 07     | V4.0.14   |

**Parametros comuns a todos os DAPs CECC-X:**

| Parameter                    | Value                    |
|------------------------------|--------------------------|
| Physical Slots               | 0..16                    |
| Fixed In Slots               | 0                        |
| Conformance Class            | B                        |
| Netload Class                | I                        |
| Min Device Interval          | 64 (2 ms)                |
| Max Input Length              | 547 bytes                |
| Max Output Length             | 547 bytes                |
| Implementation Type          | SOFTWARE                 |
| Address Assignment           | DCP; LOCAL               |
| Multiple Write Supported     | Yes                      |
| Device Access Supported      | Yes                      |
| Number of Device Access AR   | 1                        |
| Shared Device Supported      | Yes                      |
| LLDP NoD Supported           | Yes                      |
| Reset To Factory Modes       | 2                        |
| Check DeviceID Allowed       | No                       |
| Name Of Station Transferable | No                       |

---

## 3. Network Interface and Ports

### CPX-E-CEC (2 portas - switch integrado)

| Subslot | Number | ID            | SubmoduleIdentNumber | Description       |
|---------|--------|---------------|----------------------|-------------------|
| X1      | 32768  | IDS_SubItem_1I | `0x00000002`        | PN-IO Interface   |
| XF1     | 32769  | IDS_SubItem_1P1 | `0x00000003`       | Port 1            |
| XF2     | 32770  | IDS_SubItem_1P2 | `0x00000003`       | Port 2            |

- Supported RT Classes: RT_CLASS_1
- Supported Protocols: SNMP, LLDP
- Supported MIBs: MIB2
- Network Component Diagnosis: Supported
- DCP Boundary: Supported
- Multicast Boundary: Supported
- PTP Boundary: Supported
- Link State Diagnosis: Up+Down
- MAU Type: 16 (100BASE-TX full duplex)
- Max Port Rx Delay: 198 ns
- Max Port Tx Delay: 6 ns

### CECC-X (1 porta)

| Subslot | Number | ID                  | SubmoduleIdentNumber | Description       |
|---------|--------|---------------------|----------------------|-------------------|
| X1      | 32768  | IDS_1I_*            | `0x00008000`         | PN-IO Interface   |
| X1 TP1  | 32769  | IDS_SubItem_1P1_*   | `0x00008001`         | Port 1            |

- Supported RT Classes: RT_CLASS_1
- Supported Protocols: SNMP, LLDP
- Isochronous Mode: Not supported
- DCP Boundary: Supported
- PTP Boundary: Supported
- MAU Type: 16 (100BASE-TX full duplex)

### Communication Timing (ambos dispositivos)

| Parameter       | Values                                          |
|-----------------|-------------------------------------------------|
| Send Clock      | 32, 64, 128 (1 ms, 2 ms, 4 ms)                |
| Reduction Ratio | 1, 2, 4, 8, 16, 32, 64, 128, 256, 512          |
| Number of AR    | 2                                                |
| Startup Mode    | Legacy, Advanced                                 |

**Ciclo minimo efetivo:**
- CPX-E-CEC: 32 x 31.25 us = 1 ms
- CECC-X: 64 x 31.25 us = 2 ms

---

## 4. Modulos de I/O

Ambos os dispositivos utilizam os mesmos modulos de I/O genéricos. Cada módulo fornece dados simétricos (mesma quantidade de bytes para Input e Output).

### Tabela de Módulos

| Module ID | ModuleIdentNumber | Input Size | Output Size | Data Type    | Slots (CPX-E-CEC) | Slots (CECC-X) |
|-----------|-------------------|------------|-------------|--------------|---------------------|-----------------|
| IO 001    | `0x00000001`      | 1 byte     | 1 byte      | Unsigned8    | 1..16               | 1..16           |
| IO 002    | `0x00000002`      | 2 bytes    | 2 bytes     | OctetString  | 1..16               | 1..16           |
| IO 004    | `0x00000004`      | 4 bytes    | 4 bytes     | OctetString  | 1..16               | 1..16           |
| IO 008    | `0x00000008`      | 8 bytes    | 8 bytes     | OctetString  | 1..16               | 1..16           |
| IO 016    | `0x00000010`      | 16 bytes   | 16 bytes    | OctetString  | 1..16               | 1..16           |
| IO 032    | `0x00000020`      | 32 bytes   | 32 bytes    | OctetString  | 1..16               | 1..16           |
| IO 064    | `0x00000040`      | 64 bytes   | 64 bytes    | OctetString  | Definido no DAP*    | Definido no DAP*|
| IO 128    | `0x00000080`      | 128 bytes  | 128 bytes   | OctetString  | Definido no DAP*    | Definido no DAP*|

*Nota: IO 064 e IO 128 existem na ModuleList de ambos os GSDML mas NÃO estão listados na seção UseableModules do DAP. Os módulos referenciados na seção UseableModules do DAP são:
- **CPX-E-CEC:** IO 001, IO 002, IO 004, IO 008, IO 016, IO 032 (sem restrição de slot explícita)
- **CECC-X:** IO 001, IO 002, IO 004, IO 008, IO 016, IO 032 (AllowedInSlots="1..16")

Todos os módulos possuem:
- SubmoduleIdentNumber: `0x00000001`
- Consistency: All items consistency
- MayIssueProcessAlarm: false
- Dados simétricos (Input = Output em tamanho)

---

## 5. Configuração de Slots

### Estrutura de Slots

```
Slot 0:  DAP (Device Access Point) - fixo
  Subslot 32768 (0x8000): PN-IO Interface
  Subslot 32769 (0x8001): Port 1
  Subslot 32770 (0x8002): Port 2 (apenas CPX-E-CEC)

Slots 1..16: Módulos de I/O (configuráveis)
```

### Regras de Configuração

1. **Slot 0** é sempre reservado para o DAP e não pode receber módulos de I/O
2. **Slots 1 a 16** podem receber qualquer módulo de I/O suportado (IO 001 a IO 032)
3. Cada slot aceita exatamente um módulo
4. Módulos podem ser colocados em qualquer ordem nos slots
5. Não é obrigatório preencher todos os slots
6. O total de dados de I/O não deve ultrapassar os limites do DAP:
   - CPX-E-CEC: 1024 bytes input + 1024 bytes output
   - CECC-X: 547 bytes input + 547 bytes output

### Exemplo de Configuração Típica

Para uma aplicação com 64 bytes de I/O total:

```
Slot 0:  DAP (CPX-E-CEC V1 ou CECC-X-M1)
Slot 1:  IO 032 (32 bytes IN + 32 bytes OUT)
Slot 2:  IO 032 (32 bytes IN + 32 bytes OUT)
         Total: 64 bytes Input, 64 bytes Output
```

Para distribuição por módulos CPX-E no barramento:

```
Slot 0:  DAP
Slot 1:  IO 002  (2 bytes - ex: CPX-E-8DO, 8 outputs digitais)
Slot 2:  IO 002  (2 bytes - ex: CPX-E-16DI, 16 inputs digitais)
Slot 3:  IO 008  (8 bytes - ex: CPX-E-4AI-U-I, 4 inputs analógicos)
Slot 4:  IO 008  (8 bytes - ex: CPX-E-4AO-U-I, 4 outputs analógicos)
Slot 5:  IO 016  (16 bytes - ex: CPX-E-4IOL, 4 canais IO-Link)
```

---

## 6. Identificação para Configuração no PLC

### Valores para configuração no CODESYS / Automation Builder

**CPX-E-CEC como IO-Device:**
```
Vendor ID:          0x014D  (333)
Device ID:          0x0301  (769)
DAP ModuleIdent:    0x01000000
DAP SubmoduleIdent: 0x00000001
```

**CECC-X como IO-Device:**
```
Vendor ID:          0x014D  (333)
Device ID:          0x0302  (770)
DAP ModuleIdent:    0x00000300 (M1), 0x00000301 (M1-MV), 0x00000302 (M1-MV-S1)
DAP SubmoduleIdent: 0x00000001
```

### Module/Submodule Ident Numbers para I/O

| Tamanho I/O | Module Ident Number | Submodule Ident Number |
|-------------|---------------------|------------------------|
| 1 byte      | `0x00000001`        | `0x00000001`           |
| 2 bytes     | `0x00000002`        | `0x00000001`           |
| 4 bytes     | `0x00000004`        | `0x00000001`           |
| 8 bytes     | `0x00000008`        | `0x00000001`           |
| 16 bytes    | `0x00000010`        | `0x00000001`           |
| 32 bytes    | `0x00000020`        | `0x00000001`           |
| 64 bytes    | `0x00000040`        | `0x00000001`           |
| 128 bytes   | `0x00000080`        | `0x00000001`           |

---

## 7. I&M (Identification & Maintenance)

| Dispositivo   | Writeable IM Records |
|---------------|----------------------|
| CPX-E-CEC     | IM1, IM2, IM3        |
| CECC-X        | IM1, IM2, IM3, IM4   |

---

## 8. Diferenças-Chave entre CPX-E-CEC e CECC-X

| Característica                | CPX-E-CEC              | CECC-X                       |
|-------------------------------|------------------------|------------------------------|
| DeviceID                      | `0x0301`               | `0x0302`                     |
| Portas Ethernet               | 2 (switch integrado)   | 1                            |
| Max I/O (Input + Output)      | 1024 + 1024 bytes      | 547 + 547 bytes              |
| Ciclo mínimo                  | 1 ms                   | 2 ms                         |
| Netload Class                 | III                    | I                            |
| Conformance Class             | B                      | B                            |
| Shared Device                 | Nao                    | Sim                          |
| CheckDeviceID                 | Allowed                | Not Allowed                  |
| Multicast Boundary            | Supported              | Not specified                |
| Variantes de Hardware         | 1                      | 3 (M1, M1-MV, M1-MV-S1)     |
| Gerações                      | 1                      | 2 (Gen5: HW05, Gen4: HW07)   |
| Módulos referenciados no DAP  | IO 001..032            | IO 001..032                  |

---

## 9. Notas para Programação PLC

1. **Tamanho dos módulos I/O:** Os módulos representam blocos genéricos de bytes. O mapeamento real para os módulos físicos CPX-E (16DI, 8DO, 4AI, etc.) depende da configuração do barramento local no CPX-E-CEC/CECC-X. O tamanho do módulo Profinet deve corresponder ao tamanho de dados do módulo físico.

2. **Endereçamento:** Os dados de I/O são mapeados sequencialmente conforme a ordem dos slots configurados. O offset no PLC depende da ferramenta de engenharia utilizada.

3. **Consistência:** Todos os módulos utilizam "All items consistency", garantindo que todos os bytes de um módulo são lidos/escritos atomicamente em um único ciclo.

4. **Process Alarms:** Nenhum módulo de I/O suporta process alarms (`MayIssueProcessAlarm="false"`). Diagnósticos são acessados via registros I&M e diagnóstico de rede.

5. **Nomes de estação:** O campo DNS_CompatibleName define o nome padrão, mas o nome real é configurado via DCP durante o comissionamento. O nome de estação NÃO é transferível entre dispositivos (`NameOfStationNotTransferable="true"`).

6. **Startup:** Ambos suportam modos de startup Legacy e Advanced. O modo Advanced permite parametrização mais rápida durante a reconexão.
