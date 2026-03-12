/**
 * Step Display Template — controls which pipeline steps are visible in the UI,
 * how they are named, merged, and rendered.
 *
 * Steps NOT listed here are hidden from the studio tabs.
 * Steps with multiple stepKeys are merged into one tab (e.g. Characters, Locations).
 */
import { Film, Layers, Camera, Image, Users2, MapPin, Clapperboard, PlayCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────

export interface TabTemplate {
  /** Unique key used as the activeTab value */
  tabKey: string
  /** Display label shown in the tab bar */
  label: string
  /** Lucide icon for the tab + section header */
  icon: LucideIcon
  /** Raw backend step keys this tab consumes (order matters for entity-page) */
  stepKeys: string[]
  /**
   * Layout strategy:
   *   'universal'   — standard UniversalRenderer (single step data)
   *   'entity-page' — merged entity view with description → anchor → view pack
   *   'shots'       — per-shot view merging storyboard metadata + generated images
   */
  layout: 'universal' | 'entity-page' | 'shots' | 'animations'
  /**
   * For entity-page layout: the key inside the description step's blob data
   * that holds the entity dict/array.
   * e.g. 'Characters' for character design, 'key_locations' for locations.
   */
  entityKey?: string
  /**
   * Human-readable labels for each constituent step in a multi-step tab.
   * Used to generate granular approval CTAs ("Approve & Generate Anchor Images").
   * Index matches stepKeys.
   */
  subStepLabels?: string[]
}

// ─── Template ─────────────────────────────────────────────────

export const STEP_DISPLAY_TEMPLATE: TabTemplate[] = [
  {
    tabKey: 'show_bible',
    label: 'Show Bible',
    icon: Film,
    stepKeys: ['run_show_bible'],
    layout: 'universal',
  },
  {
    tabKey: 'characters',
    label: 'Characters',
    icon: Users2,
    stepKeys: [
      'run_character_design',
      'generate_anchor_image_for_character',
      'generate_view_pack_images_for_character',
    ],
    layout: 'entity-page',
    entityKey: 'Characters',
    subStepLabels: ['Character Designs', 'Anchor Images', 'View Pack Images'],
  },
  {
    tabKey: 'locations',
    label: 'Locations',
    icon: MapPin,
    stepKeys: [
      'run_key_location',
      'generate_anchor_image_for_key_location',
      'generate_view_pack_images_for_key_location',
    ],
    layout: 'entity-page',
    entityKey: 'Key_Locations',
    subStepLabels: ['Key Locations', 'Anchor Images', 'View Pack Images'],
  },
  {
    tabKey: 'beat_breakdown',
    label: 'Beat Breakdown',
    icon: Layers,
    stepKeys: ['run_beat_breakdown'],
    layout: 'universal',
  },
  {
    tabKey: 'storyboard',
    label: 'Storyboard',
    icon: Camera,
    stepKeys: ['run_storyboard_prompt'],
    layout: 'universal',
  },
  {
    tabKey: 'shots',
    label: 'Shots',
    icon: Clapperboard,
    stepKeys: [
      'run_storyboard_prompt',
      'generate_images_nano_banana',
    ],
    layout: 'shots',
  },
  {
    tabKey: 'animations',
    label: 'Animations',
    icon: PlayCircle,
    stepKeys: ['generate_animations'],
    layout: 'animations',
  },
]

// ─── Derived helpers ──────────────────────────────────────────

/** Flat set of every step key that appears in at least one tab */
export const VISIBLE_STEP_KEYS = new Set(
  STEP_DISPLAY_TEMPLATE.flatMap(t => t.stepKeys),
)

/** Maps a raw step_key → its parent tabKey */
export const STEP_TO_TAB: Record<string, string> = {}
for (const t of STEP_DISPLAY_TEMPLATE) {
  for (const sk of t.stepKeys) {
    STEP_TO_TAB[sk] = t.tabKey
  }
}
