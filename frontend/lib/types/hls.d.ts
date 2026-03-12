declare module 'hls.js' {
  interface HlsConfig {
    enableWorker?: boolean
    lowLatencyMode?: boolean
    maxBufferLength?: number
    maxMaxBufferLength?: number
    [key: string]: any
  }

  interface HlsEvents {
    ERROR: string
    [key: string]: string
  }

  class Hls {
    static isSupported(): boolean
    static Events: HlsEvents
    constructor(config?: Partial<HlsConfig>)
    loadSource(url: string): void
    attachMedia(media: HTMLVideoElement): void
    on(event: string, callback: (...args: any[]) => void): void
    destroy(): void
  }

  export default Hls
}
