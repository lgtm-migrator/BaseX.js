export class MathX {
	public static Clamp(val: number, min: number, max: number): number {
		// NUMBER
		if (val < min) return min;
		return val >= max ? max - 1 : val;
	}
	public static Sqrt(d: number): number {
		return Math.sqrt(d);
	}
}
