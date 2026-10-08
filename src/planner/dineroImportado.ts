import type { Fila, Mes } from './db'

/**
 * Datos traídos de «Cuentas Claras» (8-oct-2026). Se cargan una sola vez.
 * Lo que estaba apuntado en septiembre pasa a octubre (petición de Tomás); septiembre queda vacío.
 */
export const MESES_IMPORTADOS: Mes[] = [
 {
  "key": "2026-10",
  "gastosFijos": [
   {
    "concepto": "hipoteca ",
    "id": "4de2c46e-9060-4540-92f5-61d12b1ecc0a",
    "importe": 700
   },
   {
    "concepto": "Luz ",
    "id": "280ab2cb-bcc4-4410-ac3b-ac00ecbfc73a",
    "importe": 80
   },
   {
    "concepto": "Agua ",
    "id": "bb99daad-0226-4d86-a573-da6c80d94c13",
    "importe": 15
   },
   {
    "concepto": "movistar ",
    "id": "b555448e-9073-4fac-827a-73066a185432",
    "importe": 125
   },
   {
    "concepto": "GYM",
    "id": "f70f713e-c97a-427f-a745-cb25b4e7197f",
    "importe": 40
   },
   {
    "concepto": "coche ",
    "id": "ccd1c7cf-8fae-4164-a51f-80aed2800959",
    "importe": 150
   },
   {
    "concepto": "cuota a inversión activa ",
    "id": "5f029a2e-dda1-4e04-a200-743f558a89c8",
    "importe": 100
   },
   {
    "concepto": "curso racks",
    "id": "49633356-ea9c-4197-81e0-f6748d54079d",
    "importe": 150
   },
   {
    "concepto": "vitro",
    "id": "197c9681-7351-46b9-8555-b477b58581e4",
    "importe": 27
   },
   {
    "concepto": "c. ingles",
    "id": "ae85c29a-ba1c-4f25-81c8-92d0b1a8f2a6",
    "importe": 90
   },
   {
    "concepto": "dentista",
    "id": "305dfa6e-0feb-4681-90f7-5baf50280f10",
    "importe": 54
   },
   {
    "concepto": "comunidad",
    "id": "37595abe-a37a-4917-955b-a2df6cfe65fc",
    "importe": 120
   },
   {
    "concepto": "gym",
    "id": "c2f5678a-9875-47d9-b566-99a1897dad2d",
    "importe": 30
   },
   {
    "concepto": "cuota a plan joven",
    "id": "f899334b-1eee-45de-9709-7a31476a782a",
    "importe": 30
   },
   {
    "concepto": "internet campo ",
    "id": "330ba9ec-b946-4ba3-87cb-8fd9d31410a5",
    "importe": 75
   },
   {
    "concepto": "pienso",
    "id": "486d62a8-51e5-41d0-88c4-0f7229fd50da",
    "importe": 60
   },
   {
    "concepto": "",
    "id": "cfef907e-392c-409b-9f80-e0e76b68e74d",
    "importe": 0
   }
  ],
  "gastosVariables": [
   {
    "concepto": "Colchón ",
    "id": "38531ee6-77e9-4fa7-8475-df48faa79276",
    "importe": 370
   },
   {
    "concepto": "Comida ",
    "id": "629bee28-ed14-4d37-8aa2-ddc771d5efb2",
    "importe": 100
   },
   {
    "concepto": "Otros ",
    "id": "5630e7ea-0b5b-43a2-8a90-55712b4d7892",
    "importe": 100
   },
   {
    "concepto": "Vivero ",
    "id": "dcf205e7-f4ad-4d38-b45b-918e1d526a4d",
    "importe": 50
   },
   {
    "concepto": "Coche ",
    "id": "d8a4fcc2-c97c-4d52-8bd7-c1264283c2a1",
    "importe": 180
   },
   {
    "concepto": "",
    "id": "91b35730-e5c8-43e3-a44b-6169b713a460",
    "importe": 0
   }
  ],
  "ingresos": [
   {
    "concepto": "Nómina 1",
    "id": "585bce5d-571d-4759-aeeb-588a2c0b7e85",
    "importe": 1700
   },
   {
    "concepto": "Nómina 2",
    "id": "6949bb2a-709b-41d9-b9cb-2c8e1e4a3d28",
    "importe": 1900
   },
   {
    "concepto": "Alquiler 1 ",
    "id": "e76a2d81-9a96-4294-8749-d98c6a8eef62",
    "importe": 500
   },
   {
    "concepto": "Alquiler 2 ",
    "id": "e9202f33-000c-40be-a7df-5d573d695499",
    "importe": 900
   },
   {
    "concepto": "extra ",
    "id": "3e916521-9e22-4de4-94f5-ea18c5e3cb2a",
    "importe": 0
   }
  ]
 },
 {
  "key": "2026-09",
  "gastosFijos": [],
  "gastosVariables": [],
  "ingresos": []
 },
 {
  "key": "2026-11",
  "gastosFijos": [],
  "gastosVariables": [],
  "ingresos": []
 }
]

export const PLANTILLA_IMPORTADA: Fila[] = [
 {
  "concepto": "Hipoteca ",
  "id": "297f8919-cc4a-4166-a268-884c4396b10e",
  "importe": 700
 },
 {
  "concepto": "Comunidad ",
  "id": "9fd88589-9143-4159-9353-c3a6c691c2dc",
  "importe": 50
 },
 {
  "concepto": "Agua ",
  "id": "89d6265c-cfae-43c4-a653-a5334ed7ef56",
  "importe": 30
 },
 {
  "concepto": "Comunidad 2 ",
  "id": "a3296609-0615-47b8-9cdd-44ddfeb67ddd",
  "importe": 50
 },
 {
  "concepto": "C ingles ",
  "id": "21c16ce3-85dd-437d-b5f6-6b1cf9008d1a",
  "importe": 90
 },
 {
  "concepto": "Coche ",
  "id": "91e023ae-049f-4e96-be14-a2d4ed3dd94b",
  "importe": 200
 },
 {
  "concepto": "Curso ",
  "id": "a0aa1fc6-ce84-4e63-bc8e-9ce78ce761a1",
  "importe": 156
 },
 {
  "concepto": "Movistar ",
  "id": "ecc38aea-4bc8-40b3-957e-3adff8130619",
  "importe": 120
 },
 {
  "concepto": "Vitro ",
  "id": "c03823ab-a5cd-4a4b-9832-eed8e0258783",
  "importe": 20
 },
 {
  "concepto": "Gym m ",
  "id": "9e4ea152-2000-44c0-bde9-4e2c6c02b596",
  "importe": 40
 },
 {
  "concepto": "Gym t",
  "id": "8d90ad95-ecb9-4f51-ae96-5e355d29845d",
  "importe": 32
 },
 {
  "concepto": "Banco ",
  "id": "61f96b17-4d5c-4dc9-ad1c-a6f1059060ee",
  "importe": 30
 },
 {
  "concepto": "Inv activa ",
  "id": "502ddce9-2107-4dde-b578-cf6ffddebad3",
  "importe": 150
 },
 {
  "concepto": "Pienso",
  "id": "eeee2430-d35d-4402-8f31-ca0d0e02cabf",
  "importe": 20
 }
]
