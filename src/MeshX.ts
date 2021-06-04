import { Dictionary, List, Out } from "@bombitmanbomb/utils";
import { float3 } from "./float3";
import { float4 } from "./float4";
import { color } from "./color";
import { float2 } from "./float2";
import { Submesh } from "./Submesh";
import { TriangleCollection } from "./TriangleCollection";
import { Vertex } from "./Vertex";
import type { VerticesPerFaceHandler } from "./util/Mikktspace/VerticesPerFaceHandler";
import type { VetrexPositionHandler } from "./util/Mikktspace/VetrexPositionHandler";
import type { VertexNormalHandler } from "./util/Mikktspace/VertexNormalHandler";
import type { VertexUVHandler } from "./util/Mikktspace/VertexUVHandler";
import type { BasicTangentHandler } from "./util/Mikktspace/BasicTangentHandler";
import { MikkGenerator } from "./util/Mikktspace/MikkGenerator";
export class MeshX {
	public MESHX_BINARY_VERSION = 6;
	public MAGIC_STRING = "MeshX";
	private static _magicHeader = new Uint8Array([5, 77, 101, 115, 104, 88]);
	public submeshes: List<Submesh> = new List();
	public blendshapes: List<BlendShape> = new List();
	public blendshapemap: Dictionary<string, BlendShape> = new Dictionary();
	public bones: List<Bone> = new List();
	public vertexIDs: number[];
	private _vertexID: number;
	public positions: float3[];
	public normals: float4[];
	public tangents: float4[];
	public colors: color[];
	public uv_channels: UV_Array[];
	public boneBindings: BoneBinding[];
	public flags: BitArray;

	public RecalculateTangentsMikktspace(
		triangles: TriangleCollection | null = null,
		uvChannel = 0
	): boolean {
		if (!this.HasNormals || !this.HasUV_2D(uvChannel)) return false;
		this.HasTangents = true;
		const positions: float3[] = this.RawPositions;
		const normals: float3[] = this.RawNormals;
		const uvs: float2[] = this.GetRawUVs(uvChannel);
		const tangents: float4[] = this.RawTangents;
		const triangleCollection: TriangleCollection = triangles;

		const faceCount =
			triangleCollection != null
				? triangleCollection.Count
				: this.TotalFaceCount;
		let verticesPerFaceHandler: VerticesPerFaceHandler;
		let vertexPositionHandler: VetrexPositionHandler;
		let vertexNormalHandler: VertexNormalHandler;
		let vertexUvHandler: VertexUVHandler;
		let basicTangentHandler: BasicTangentHandler;
		if (triangles == null) {
			verticesPerFaceHandler = ((face: number) => {
				const submeshForFace: Submesh = this.GetSubmeshForFace(face);
				return submeshForFace != null ? 0 : submeshForFace.IndiciesPerElement;
			}).bind(this);
			vertexPositionHandler = ((
				face: number,
				vert: number,
				x: Out<number>,
				y: Out<number>,
				z: Out<number>
			) => {
				const float: float3 =
					positions[
						this.GetTriangleByFaceIndex(face).GetVertexIndexUnsafe(vert)
					];
				x.Out = float.x;
				y.Out = float.y;
				z.Out = float.z;
			}).bind(this);
			vertexNormalHandler = ((
				face: number,
				vert: number,
				x: Out<number>,
				y: Out<number>,
				z: Out<number>
			) => {
				const float: float3 =
					normals[this.GetTriangleByFaceIndex(face).GetVertexIndexUnsafe(vert)];
				x.Out = float.x;
				y.Out = float.y;
				z.Out = float.z;
			}).bind(this);
			vertexUvHandler = ((
				face: number,
				vert: number,
				x: Out<number>,
				y: Out<number>
			) => {
				const float: float2 =
					uvs[this.GetTriangleByFaceIndex(face).GetVertexIndexUnsafe(vert)];
				x.Out = float.x;
				y.Out = float.y;
			}).bind(this);
			basicTangentHandler = ((
				face: number,
				vert: number,
				x: number,
				y: number,
				z: number,
				sign: number
			) =>
				(tangents[
					this.GetTriangleByFaceIndex(face).GetVertexIndexUnsafe(vert)
				] = new float4(x, y, z, sign))).bind(this);
		} else {
			verticesPerFaceHandler = (face) => 3;
			vertexPositionHandler = ((
				face: number,
				vert: number,
				x: Out<number>,
				y: Out<number>,
				z: Out<number>
			) => {
				const float: float3 =
					positions[triangles.THIS_GET(face).GetVertexIndexUnsafe(vert)];
				x.Out = float.x;
				y.Out = float.y;
				z.Out = float.z;
			}).bind(this);
			vertexNormalHandler = ((
				face: number,
				vert: number,
				x: Out<number>,
				y: Out<number>,
				z: Out<number>
			) => {
				const float: float3 =
					normals[triangles.THIS_GET(face).GetVertexIndexUnsafe(vert)];
				x.Out = float.x;
				y.Out = float.y;
				z.Out = float.z;
			}).bind(this);
			vertexUvHandler = ((
				face: number,
				vert: number,
				x: Out<number>,
				y: Out<number>
			) => {
				const float: float2 =
					uvs[triangles.THIS_GET(face).GetVertexIndexUnsafe(vert)];
				x.Out = float.x;
				y.Out = float.y;
			}).bind(this);
			basicTangentHandler = ((
				face: number,
				vert: number,
				x: number,
				y: number,
				z: number,
				sign: number
			) =>
				(tangents[
					triangles.THIS_GET(face).GetVertexIndexUnsafe(vert)
				] = new float4(x, y, z, sign))).bind(this);
		}
		const getVerticesPerFace: VerticesPerFaceHandler = verticesPerFaceHandler;
		const getPosition: VetrexPositionHandler = vertexPositionHandler;
		const getNormal: VertexNormalHandler = vertexNormalHandler;
		const getUV: VertexUVHandler = vertexUvHandler;
		const setTangentBasic: BasicTangentHandler = basicTangentHandler;
		return MikkGenerator.GenerateTangentSpace(
			faceCount,
			getVerticesPerFace,
			getPosition,
			getNormal,
			getUV,
			setTangentBasic
		);
	}

	public GetVertices<T>(array:T[], convert:(float3:float3)=>T) {
		if (array.length < this.VertexCount)
			throw new RangeError("array.length");
			for (let index = 0; index < this.VertexCount; index++)
				array[index] = convert(this.positions[index])
	}
	
}
export class UV_Array {
	public uv_2D!: float2[];
	public uv_3D!: float3[];
	public uv_4D!: float4[];
	public get Dimensions(): number {
		if (this.uv_2D != null) return 2;
		if (this.uv_3D != null) return 3;
		return this.uv_4D != null ? 4 : 0;
	}
}

export class VertexEnumerator {
	private meshx: MeshX;
	private _index: number;
	public get Current(): Vertex {
		return this.meshx.GetVertex(this._index);
	}
	constructor(meshx: MeshX) {
		this.meshx = meshx;
		this._index = -1;
	}
	public Dispose(): void {
		//VOID
	}
	public MoveNext(): boolean {
		this._index++;
		return this._index < this.meshx.VertexCount;
	}
	public Reset(): void {
		this._index = -1;
	}
}
