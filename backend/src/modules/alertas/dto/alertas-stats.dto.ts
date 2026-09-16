export interface AlertasStatsDto {
  total: number;
  noLeidas: number;
  porCriticidad: {
    preventivas: number;
    moderadas: number;
    criticas: number;
    vencidas: number;
  };
}
