// Comprehensive data types for the Loqo Studios project structure
// Based on beat_breakdown, storyboard, shot_intent_mapping, characters, and locations

export interface Character {
  id: string
  name: string
  culturalContext: string
  visualDesign: string
  ageGender: string
  physicalDescription: string
  attire: string
}

export interface Location {
  id: string
  name: string
  type: 'interior' | 'exterior'
  narrativeRole: string
  visualProfile: {
    environment: string
    culturalOrEraStyle: string
    architectureOrSpace: string
    lightingTimeOfDay: string
    keyObjectsOrFeatures: string[]
  }
}

export interface ShotMetadata {
  panelNumber: number
  beatNumber: number
  shotSummary: string
}

export interface Cinematography {
  shotSizeAngle: string // e.g., "MS front", "CU low", "WS low", "MCU side"
  lensIntent: string // e.g., "35mm", "50mm", "85mm", "24mm"
  cameraMovement: string // e.g., "Static", "Slow follow", "Slow push", "Parallax"
}

export interface Composition {
  subjectComposition: string
  action: string
}

export interface Setting {
  keyLocation: string
  scenography: string
  timeContext: string
}

export interface CharacterInShot {
  characterName: string
  characterVisualIdentity: string
}

export interface StoryContext {
  visualStyleGuide: string
  projectContext: string
  eraCultureContext: string
  emotionalThematicIntent: string
}

export interface Audio {
  dialogue: string
  audioCueIntent: string
}

export interface Shot {
  id: string
  metadata: ShotMetadata
  cinematography: Cinematography
  composition: Composition
  setting: Setting
  characterFocalPosition: string | null
  characters: CharacterInShot[]
  storyContext: StoryContext
  audio: Audio
}

export interface ShotIntent {
  shot: string // e.g., "1A", "2B"
  intentTitle: string
  intent: string
  emotion: string
  narrativeFunction: string
  estimatedDuration: string
}

export interface Beat {
  id: string
  beatNumber: number
  title: string
  sceneRef: string
  screenplayLines: string[]
  timeRange: string
  description: string
  emotion: string
  shots: ShotIntent[]
}

export interface Episode {
  id: string
  episodeNumber: number
  title: string
  name?: string
  description: string
  beats: Beat[]
}

export interface Scene {
  id: string
  episodeId: string
  sceneNumber: number
  title: string
  description: string
  beats: Beat[]
  storyboardShots: Shot[]
}

export interface ProjectShowBible {
  projectName: string
  imageStyle: string
  genre: string
  themes: string[]
  setting: string
  directorialTreatment: string
}

export interface Project {
  id: string
  name: string
  description: string
  type: 'Film' | 'Series'
  episodes: Episode[]
  characters?: Character[]
  locations?: Location[]
  showBible: ProjectShowBible
}
