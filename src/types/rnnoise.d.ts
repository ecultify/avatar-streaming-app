// Type declarations for packages without TypeScript definitions

declare module '@jitsi/rnnoise-wasm' {
    interface RNNoiseModule {
        newState(): any;
        deleteState(state: any): void;
        pipe(state: any, buffer: Float32Array): void;
    }

    export default function createRNNoise(): Promise<RNNoiseModule>;
}
