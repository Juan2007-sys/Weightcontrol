export interface InstrumentoStatsDto {
  total: number;
  porEstado: {
    vigentes: number;
    porVencer: number;
    vencidos: number;
  };
  porTipo: {
    basculas: number;
    pesas: number;
    dinamometros: number;
  };
  porCategoriaExactitud: {
    claseI: number;
    claseII: number;
    claseIII: number;
    claseIIII: number;
  };
}
