// Part Structure
export interface Part {
  partNumber: number;
  partTitle: string;
  beats: Beat[];
}

// Beat Structure
export interface Beat {
  Beat_Number: number;
  Title: string;
  Scene_Ref: string;
  Screenplay_lines: string[];
  Time_Range: string;
  Description: string;
  Emotion: string;
  shots?: Shot[];
}

// Shot Structure
export interface Shot {
  shot: string;
  intent_title: string;
  intent: string;
  emotion: string;
  narrative_function: string;
  estimated_duration: string;
}

// Storyboard Panel
export interface StoryboardPanel {
  metadata: {
    panel_number: number;
    beat_number: number;
    shot_summary: string;
  };
  cinematography: {
    shot_size_angle: string;
    lens_intent: string;
    camera_movement: string;
  };
  composition: {
    subject_composition: string;
    action: string;
  };
  setting: {
    key_location: string;
    scenography: string;
    time_context: string;
  };
  character_focal_position: string | null;
  characters: StoryboardCharacter[];
  story_context: {
    visual_style_guide: string;
    project_context: string;
    era_culture_context: string;
    emotional_thematic_intent: string;
  };
  audio: {
    dialogue: string;
    audio_cue_intent: string;
  };
}


export interface StoryboardCharacter {
  character_name: string;
  character_visual_identity: string;
}

// Character Description
export interface Character {
  "Name/Identifier": string;
  "Cultural Context": string;
  "Visual Design": string;
  "Age & Gender": string;
  "Physical Description": string;
  Attire: string;
}

// Asset (Character / Location / Prop) from API
export interface AssetOut {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  content: string;
  imageIds: string[];
  category?: string;
  scope: { project: boolean; episodeIds: string[]; partIds: string[] };
  createdAt: string;
  updatedAt: string;
}

export interface AssetImageOut {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  createdAt: string;
}

export interface AssetDetailOut extends AssetOut {
  images: AssetImageOut[];
}

// Location
export interface Location {
  location_id: string;
  name: string;
  type: string;
  narrative_role: string;
  visual_profile: {
    environment: string;
    cultural_or_era_style: string;
    architecture_or_space: string;
    lighting_time_of_day: string;
    key_objects_or_features: string[];
  };
}

// Show Bible
export interface ShowBible {
  Project: string;
  Image_style: string;
  Genre: string;
  Themes: string[];
  Setting: string;
  Directorial_Treatment: string;
}

// Episode with Parts and Beats
export interface Episode {
  number: number;
  title: string;
  name?: string;
  status: "in-progress" | "draft" | "completed";
  beatCount: number;
  beats: Beat[];
  parts?: Part[];
  thumbnail?: string;
  logline?: string;
}

// Project
export interface Project {
  id: string;
  title: string;
  genre: string;
  episodes: Episode[];
  characters: Record<string, Character>;
  locations: Location[];
  showBible: ShowBible;
}
