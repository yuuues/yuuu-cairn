export interface Dice {
  /** Un dado: entero en [1, face] inclusive. */
  roll(face: number): number;
  /** count dados de face caras: devuelve resultados y total. */
  rollMulti(face: number, count: number): { results: number[]; total: number };
  /** Elemento aleatorio de la lista (paridad roll_list: list[roll(len)-1]). */
  pick<T>(list: T[]): T;
}
