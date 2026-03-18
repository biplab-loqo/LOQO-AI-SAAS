/**
 * Loqo API Client — Workflow Engine
 * Images are embedded as s3_uris in step output (no separate artifacts collection).
 */
import { safeStorage } from '@/lib/safe-storage'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

// ─────────────────────────────────────────────────────────────
//  TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────

export interface MeResponse {
  id: string; email: string; name: string
  avatarUrl: string | null; bio: string | null
  has_organization: boolean; organization: OrgOut | null
}

export interface OrgOut {
  id: string; name: string; description?: string | null
  members: Array<{ id: string; email: string; name: string; avatarUrl: string | null }>
  created_at: string
}

export interface ProjectOut {
  id: string; name: string; description: string | null
  organization_id: string; created_by: string
  created_at: string; updated_at: string
}

export interface PartOut {
  id: string; projectId: string; episodeId: string
  partNumber: number; title: string; scriptText: string | null
  createdBy: string; createdAt: string; updatedAt: string
  buildProgress: Record<string, any> | null
  executionId?: string
}

export interface EpisodeOut {
  id: string; projectId: string; title: string; name?: string
  episodeNumber: number; description: string | null
  bibleText: string | null; isActive: boolean
  createdBy: string; createdAt: string; updatedAt: string
}

export interface EpisodeFullOut extends EpisodeOut {
  parts: PartOut[]
}

export interface ProjectFullOut extends ProjectOut {
  episodes: EpisodeFullOut[]
}

// ── Workflow types (matching simplified backend) ──────────────

export interface ExecutionStepSummary {
  step_key: string
  status: string
  is_approved?: boolean
  version_no: number
  has_data: boolean
  step_version_id: string | null
}

export interface ExecutionStatus {
  execution_id: string
  user_id: string | null
  template_version_id: string | null
  template_key: string | null
  title: string | null
  status: string
  current_step_key: string | null
  meta: Record<string, any> | null
  steps: ExecutionStepSummary[]
  created_at: string
  updated_at: string
}

export interface ExecutionListResponse {
  total: number
  skip: number
  limit: number
  executions: ExecutionStatus[]
}

export interface StepVersionLineage {
  type: string
  createdFromVersionId: string | null
}

/**
 * Step data from API.
 * `output` is a raw dict: { blobs, artifactRefs, s3_uris, counts }
 * No separate artifacts — images are in output.s3_uris / output.artifactRefs
 */
export interface StepData {
  step_version_id: string
  execution_id: string
  step_key: string
  version_no: number
  status: string
  is_approved?: boolean
  lineage: StepVersionLineage | null
  input: Record<string, any> | null     // v7 schema: step input/config
  output: Record<string, any> | null
  error: any | null
  created_at: string
}

export interface StepHistoryEntry {
  step_version_id: string
  version_no: number
  status: string
  is_approved?: boolean
  lineage: StepVersionLineage | null
  has_output: boolean
  created_at: string
}

export interface StepEditResult {
  step_version_id: string
  step_key: string
  version_no: number
  status: string
  lineage: StepVersionLineage | null
  created_at: string
}

export interface IterateStepResult {
  step_version_id: string
  message_id: string
  step_key: string
  version_no: number
  status: string
  lineage: StepVersionLineage | null
  created_at: string
}

export interface MessageOut {
  id: string
  execution_id: string | null
  step_key: string[] | null
  org_id: string | null
  project_id: string | null
  episode_id: string | null
  part_id: string | null
  action: string | null     // "generate" | "edit" | "iterate"
  prompt: string | null
  data: any | null
  user_id: string | null
  template_key: string | null
  created_at: string
}

export interface DemoContext {
  org_id: string
  project_id: string
  episode_id: string
  part_id: string
  execution_id: string | null
  part_url: string
}

// ── Step-key display helpers ──────────────────────────────────

/** Format a raw step key into a readable title — no hardcoded map.
 *  run_show_bible → Show Bible | generate_anchor_image_for_character → Anchor Image For Character */
export function stepDisplayName(stepKey: string): string {
  return stepKey
    .replace(/^(run_|generate_)/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Rich artifact ref types — preserves asset names, poses, shot IDs, etc.
 */
export interface LabeledImage {
  url: string
  label: string        // e.g. "Anchor Full", "Front Closeup", "Collage"
}

export interface RichEntityAssets {
  entityName: string
  images: LabeledImage[]
}

export interface RichShotRef {
  shotId: string
  imageUrl: string
}

export interface RichLocationRef {
  locationName: string
  kind: string          // "anchor", "collage", "view"
  name: string          // e.g. "FreezePack_Collage.png", "L0_Front_Center_Wide.png"
  url: string
}

export interface RichAnimationRef {
  shotId: string
  videoUrl: string
}

// ── Independent Shot / Clip table types ─────────────────────

export interface ShotMediaRefOut {
  objectId?: string | null
  displayName?: string
  awsUrl?: string
}

export interface ShotReferenceOut {
  characterId?: string
  locationId?: string
  referenceImage?: string
  displayName?: string
  awsUrl?: string
}

export interface ShotOut {
  id: string
  executionId: string
  orgId?: string | null
  projectId?: string | null
  episodeId?: string | null
  partId?: string | null
  shotId: string
  sequenceNo: number
  version: number
  isApproved: boolean
  characterReferences: ShotReferenceOut[]
  previousReferences: ShotReferenceOut[]
  locationReferences: ShotReferenceOut[]
  shotMetadata: { shotNumber: number; beatNumber?: number | null }
  oneLinerShotIntent: string
  startImagePrompt: string
  animationPrompt: string
  startImage?: ShotMediaRefOut | null
  executionMetadata?: Record<string, any> | null
  createdAt: string
  updatedAt: string
}

export interface ClipOut {
  id: string
  executionId: string
  orgId?: string | null
  projectId?: string | null
  episodeId?: string | null
  partId?: string | null
  clipId: string
  shotId: string
  sequenceNo: number
  version: number
  isApproved: boolean
  inputImages: ShotMediaRefOut[]
  animationPrompt: string
  clipOutput?: ShotMediaRefOut | null
  executionMetadata?: Record<string, any> | null
  createdAt: string
  updatedAt: string
}

export interface CollectionMediaOut {
  _id?: string | { $oid?: string }
  camera_angle?: string
  camera_node_id?: string
  file_name?: string
  display_name?: string
  s3_uri?: string
}

export interface CharacterOut {
  id: string
  org_id?: string | null
  project_id?: string | null
  episode_id?: string | null
  part_id?: string | null
  execution_id?: string | null
  character_description: Record<string, any>
  anchor_images: CollectionMediaOut[]
  view_pack_images: CollectionMediaOut[]
  collage_image?: CollectionMediaOut | null
  character_camera_library?: Record<string, any> | null
  status?: string
  is_approved?: boolean
  version: number
  created_at?: string
  updated_at?: string
}

export interface LocationOut {
  id: string
  org_id?: string | null
  project_id?: string | null
  episode_id?: string | null
  part_id?: string | null
  execution_id?: string | null
  location_description: Record<string, any>
  anchor_images: CollectionMediaOut[]
  view_pack_images: CollectionMediaOut[]
  collage_image?: CollectionMediaOut | null
  location_camera_library?: Record<string, any> | null
  status?: string
  is_approved?: boolean
  version: number
  created_at?: string
  updated_at?: string
}

/**
 * Flatten v8 artifactRefs array-of-objects into Record<string, string[]>.
 *
 * v8 step types produce different object shapes:
 *   Location: { locationName, uri }
 *   Character: { characterName, assets: { anchor_full: {uri}, views: [{uri}] } }
 *   Shot:      { shotId, image: {uri} }
 * This function groups by entity name and collects all image URLs.
 */
function _flattenArtifactRefsArray(arr: any[]): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  const push = (key: string, url: string) => {
    if (!url || typeof url !== 'string') return
    if (!result[key]) result[key] = []
    result[key].push(url)
  }

  for (const obj of arr) {
    if (!obj || typeof obj !== 'object') continue

    // Determine the entity name key
    const name: string =
      obj.locationName ?? obj.characterName ?? obj.shotId ?? obj.name ?? `item`

    // Direct URI/URL fields (location anchor, location viewpack, shot images)
    if (typeof obj.uri === 'string') push(name, obj.uri)
    if (typeof obj.url === 'string') push(name, obj.url)
    // Shot image: { image: {uri: "..."} } (v8 format — image is an object)
    if (obj.image && typeof obj.image === 'object' && typeof obj.image.uri === 'string') push(name, obj.image.uri)
    else if (typeof obj.image === 'string') push(name, obj.image)
    // Animation: { animation: {uri: "..."} } (v8 format — animation is an object)
    if (obj.animation && typeof obj.animation === 'object' && typeof obj.animation.uri === 'string') push(name, obj.animation.uri)
    else if (typeof obj.animation === 'string') push(name, obj.animation)

    // Nested assets object (character anchor / viewpack)
    if (obj.assets && typeof obj.assets === 'object') {
      for (const [, assetVal] of Object.entries(obj.assets)) {
        if (!assetVal || typeof assetVal !== 'object') continue

        if (Array.isArray(assetVal)) {
          // views: [{name, uri, url}, ...]
          for (const view of assetVal) {
            if (typeof view?.uri === 'string') push(name, view.uri)
            else if (typeof view?.url === 'string') push(name, view.url)
          }
        } else {
          // anchor_full: {uri}, collage: {uri, url}
          const av = assetVal as Record<string, any>
          if (typeof av.uri === 'string') push(name, av.uri)
          else if (typeof av.url === 'string') push(name, av.url)
        }
      }
    }
  }
  return result
}

/** Helper to get a URL string from a nested object that may have {uri} or {url} */
function _extractUrl(obj: any): string | null {
  if (!obj) return null
  if (typeof obj === 'string') return obj
  if (typeof obj === 'object') {
    if (typeof obj.uri === 'string') return obj.uri
    if (typeof obj.url === 'string') return obj.url
  }
  return null
}

/**
 * Extract RICH structured asset data from v8 artifactRefs.
 * Preserves asset type labels (anchor_full, anchor_closeup, collage, view names).
 */
function _extractRichEntityAssets(arr: any[]): RichEntityAssets[] {
  const result: RichEntityAssets[] = []

  for (const obj of arr) {
    if (!obj || typeof obj !== 'object') continue
    const entityName: string = obj.characterName ?? obj.locationName ?? obj.name ?? 'Unknown'
    const images: LabeledImage[] = []

    // Direct URI (e.g. location anchor: {locationName, kind: "anchor", uri})
    const directUrl = _extractUrl(obj.uri) ?? _extractUrl(obj.url)
    if (directUrl) {
      const label = obj.kind ?? obj.name ?? 'Image'
      images.push({ url: directUrl, label: _prettifyLabel(String(label)) })
    }

    // Nested assets object (character anchor / viewpack)
    if (obj.assets && typeof obj.assets === 'object') {
      for (const [assetKey, assetVal] of Object.entries(obj.assets)) {
        if (!assetVal || typeof assetVal !== 'object') continue

        if (Array.isArray(assetVal)) {
          // views: [{name, uri, url}, ...]
          for (const view of assetVal as any[]) {
            const viewUrl = _extractUrl(view)
            if (viewUrl) {
              const viewLabel = view?.name
                ? _prettifyLabel(String(view.name).replace(/\.\w+$/, ''))  // strip .png
                : _prettifyLabel(assetKey)
              images.push({ url: viewUrl, label: viewLabel })
            }
          }
        } else {
          // anchor_full: {uri}, collage: {uri, url}
          const url = _extractUrl(assetVal)
          if (url) {
            images.push({ url, label: _prettifyLabel(assetKey) })
          }
        }
      }
    }

    if (images.length > 0) {
      // Merge into existing entity if same name
      const existing = result.find(r => r.entityName === entityName)
      if (existing) {
        existing.images.push(...images)
      } else {
        result.push({ entityName, images })
      }
    }
  }
  return result
}

/**
 * Extract shot refs from v8 nano_banana artifactRefs.
 * Each ref: { shotId: "1", image: {uri: "https://..."} }
 */
function _extractShotRefs(arr: any[]): RichShotRef[] {
  const result: RichShotRef[] = []
  for (const obj of arr) {
    if (!obj || typeof obj !== 'object' || !obj.shotId) continue
    const url = _extractUrl(obj.image) ?? _extractUrl(obj.uri) ?? _extractUrl(obj.url)
    if (url) {
      result.push({ shotId: String(obj.shotId), imageUrl: url })
    }
  }
  return result.sort((a, b) => Number(a.shotId) - Number(b.shotId))
}

/**
 * Extract location refs with kind/name from v8 artifactRefs.
 * Each ref: { locationName, locationId, kind: "collage"|"view", name: "L0_Front_Center_Wide.png", uri }
 */
function _extractLocationRefs(arr: any[]): RichLocationRef[] {
  const result: RichLocationRef[] = []
  for (const obj of arr) {
    if (!obj || typeof obj !== 'object') continue
    const locName = obj.locationName ?? obj.name ?? 'Unknown'
    const url = _extractUrl(obj.uri) ?? _extractUrl(obj.url)
    if (url) {
      result.push({
        locationName: locName,
        kind: obj.kind ?? 'image',
        name: obj.name ?? '',
        url,
      })
    }
  }
  return result
}

/**
 * Extract animation refs from v8 generate_animations artifactRefs.
 * Each ref: { shotId: "1", animation: {uri: "s3://...mp4"} }
 */
function _extractAnimationRefs(arr: any[]): RichAnimationRef[] {
  const result: RichAnimationRef[] = []
  for (const obj of arr) {
    if (!obj || typeof obj !== 'object' || !obj.shotId) continue
    const url = _extractUrl(obj.animation) ?? _extractUrl(obj.uri) ?? _extractUrl(obj.url)
    if (url) {
      result.push({ shotId: String(obj.shotId), videoUrl: url })
    }
  }
  return result.sort((a, b) => Number(a.shotId) - Number(b.shotId))
}

/** Convert snake_case/camelCase asset key to readable label */
function _prettifyLabel(s: string): string {
  return s
    .replace(/\.\w+$/, '')        // strip file extension
    .replace(/[_-]+/g, ' ')       // underscores/hyphens to spaces
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase split
    .replace(/\b\w/g, l => l.toUpperCase()) // capitalize words
    .trim()
}

/**
 * Extract merged data from step output blobs.
 * output shape: { blobs: [{kind, data}], artifactRefs: {...}, s3_uris: [...], counts: {...} }
 */
export function extractStepData(step: StepData): Record<string, any> {
  if (!step.output) return {}
  const merged: Record<string, any> = {}
  const textBlobs: string[] = []

  // Merge blob data
  const blobs = step.output.blobs
  if (Array.isArray(blobs)) {
    // Track which keys have been set (case-insensitive) to avoid duplicates
    const seenKeysLower = new Set<string>()
    let arrayIdx = 0

    for (const blob of blobs) {
      let d = blob.data
      if (typeof d === 'string') {
        try { d = JSON.parse(d) } catch {
          // Text blob (plain prompt text, etc.) — keep as-is
          if ((d as string).trim()) textBlobs.push(d as string)
          continue
        }
      }
      if (d && typeof d === 'object' && !Array.isArray(d)) {
        // Dict blob: merge keys, but skip exact case-insensitive duplicates
        for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
          if (!seenKeysLower.has(k.toLowerCase())) {
            merged[k] = v
            seenKeysLower.add(k.toLowerCase())
          }
        }
      } else if (d && Array.isArray(d)) {
        // Array blob: derive key from path, else use a unique indexed key
        const pathKey = blob.path?.split('/').pop()?.replace('.json', '')
        let key = pathKey ?? (blob.kind ?? 'items')
        // Avoid overwriting an existing key from a previous array blob
        if (seenKeysLower.has(key.toLowerCase())) key = `${key}_${++arrayIdx}`
        merged[key] = d
        seenKeysLower.add(key.toLowerCase())
      }
    }
  }

  // Text blobs — pass through as internal array (rendered as prose cards)
  if (textBlobs.length > 0) merged._textBlobs = textBlobs

  // Pass through artifactRefs (named image groups per entity).
  // Handles BOTH v7 dict format { name: [uri, ...] } and
  // v8 array-of-objects format [ {locationName, uri}, {characterName, assets:{...}}, ... ]
  // Normalised output is always Record<string, string[]>.
  if (step.output.artifactRefs && typeof step.output.artifactRefs === 'object') {
    const art = step.output.artifactRefs

    if (Array.isArray(art)) {
      // ── v8 format: array of structured objects ──
      merged._artifactRefs = _flattenArtifactRefsArray(art)

      // Also extract rich structured data for UI display with labels
      merged._richAssets = _extractRichEntityAssets(art)
      merged._shotRefs = _extractShotRefs(art)
      merged._locationRefs = _extractLocationRefs(art)
      merged._animRefs = _extractAnimationRefs(art)
    } else {
      // ── v7 format: dict of string | string[] ──
      const raw = art as Record<string, unknown>
      const normalized: Record<string, string[]> = {}
      for (const [k, v] of Object.entries(raw)) {
        if (Array.isArray(v)) normalized[k] = v as string[]
        else if (typeof v === 'string') normalized[k] = [v]
      }
      merged._artifactRefs = normalized
    }
  }

  // Pass through flat s3_uris image list (for steps with no artifactRefs)
  if (Array.isArray(step.output.s3_uris) && step.output.s3_uris.length > 0) {
    merged._s3Uris = step.output.s3_uris
  }

  return merged
}

/**
 * Get all blobs from step output as an array.
 */
export function getStepBlobs(step: StepData): Array<{ kind: string; path: string | null; data: any }> {
  if (!step.output?.blobs?.length) return []
  return step.output.blobs.map((b: any) => {
    let d = b.data
    if (typeof d === 'string') { try { d = JSON.parse(d) } catch {} }
    return { kind: b.kind ?? 'unknown', path: b.path ?? null, data: d }
  })
}

// ─────────────────────────────────────────────────────────────
//  API CLIENT CLASS
// ─────────────────────────────────────────────────────────────

export class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
    this.token = safeStorage.getItem('auth_token')
  }

  setToken(token: string) {
    this.token = token
    safeStorage.setItem('auth_token', token)
    if (typeof document !== 'undefined') {
      document.cookie = `auth_token=${token}; path=/; max-age=${6 * 60 * 60}; SameSite=Strict`
    }
  }

  clearToken() {
    this.token = null
    safeStorage.removeItem('auth_token')
    if (typeof document !== 'undefined') {
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token) h['Authorization'] = `Bearer ${this.token}`
    return h
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken()
        if (typeof window !== 'undefined') window.location.href = '/auth/login'
        throw new Error('Authentication expired. Please login again.')
      }
      const text = await response.text().catch(() => 'An error occurred')
      throw new Error(text)
    }
    return response.json()
  }

  private async get<T = any>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v) })
    const r = await fetch(url.toString(), { method: 'GET', headers: this.headers, credentials: 'include' })
    return this.handleResponse<T>(r)
  }

  private async post<T = any>(path: string, body?: Record<string, any>): Promise<T> {
    const r = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST', headers: this.headers, credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(r)
  }

  private async put<T = any>(path: string, body?: Record<string, any>): Promise<T> {
    const r = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT', headers: this.headers, credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(r)
  }

  private async del<T = any>(path: string): Promise<T> {
    const r = await fetch(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers, credentials: 'include' })
    return this.handleResponse<T>(r)
  }

  private async patch<T = any>(path: string, body?: Record<string, any>): Promise<T> {
    const r = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH', headers: this.headers, credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(r)
  }

  private async postPublic<T = any>(path: string, body: Record<string, any>): Promise<T> {
    const r = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(body),
    })
    return this.handleResponse<T>(r)
  }

  // ── AUTH ──────────────────────────────────────────────────

  async googleLogin(idToken: string) {
    const response = await this.postPublic<{
      access_token: string; token_type: string
      user: { id: string; email: string; name: string; avatarUrl: string | null; bio: string | null }
      has_organization: boolean; organization: OrgOut | null
    }>('/auth/login', { id_token: idToken })
    this.setToken(response.access_token)
    return response
  }


  async getMe() { return this.get<MeResponse>('/auth/me') }
  async logout() { try { await this.post('/auth/logout') } finally { this.clearToken() } }

  // ── ORGANIZATION ──────────────────────────────────────────

  async createOrganization(name: string) { return this.post<OrgOut>('/organizations', { name }) }
  async getMyOrganization() { return this.get<OrgOut>('/organizations/me') }
  async updateOrganization(data: { name?: string; description?: string }) {
    const org = await this.getMyOrganization()
    return this.put<OrgOut>(`/organizations/${org.id}`, data)
  }
  async deleteOrganization() {
    const org = await this.getMyOrganization()
    return this.del(`/organizations/${org.id}`)
  }
  async addMember(email: string) {
    const org = await this.getMyOrganization()
    return this.post<{ id: string; email: string; name: string; avatarUrl: string | null }>(
      `/organizations/${org.id}/members`, { email }
    )
  }
  async getMembers() { const org = await this.getMyOrganization(); return org.members }

  // ── USER PROFILE ──────────────────────────────────────────

  async getProfile() {
    const me = await this.getMe()
    return { id: me.id, email: me.email, name: me.name, avatarUrl: me.avatarUrl, bio: me.bio, created_at: '', has_organization: me.has_organization }
  }
  async updateProfile(data: { name?: string; bio?: string }) {
    return this.put<{ id: string; email: string; name: string; avatarUrl: string | null; bio: string | null; created_at: string; has_organization: boolean }>('/users/me', data)
  }

  // ── PROJECTS ──────────────────────────────────────────────

  async createProject(data: { name: string; description?: string }) {
    return this.post<ProjectOut>('/projects', data)
  }
  async getProjects() { return this.get<ProjectOut[]>('/projects') }
  async getProject(projectId: string) { return this.get<ProjectFullOut>(`/projects/${projectId}`) }
  async getProjectFull(projectId: string) { return this.get<ProjectFullOut>(`/projects/${projectId}`) }
  async updateProject(projectId: string, data: { name?: string; description?: string }) {
    return this.put<ProjectOut>(`/projects/${projectId}`, data)
  }
  async deleteProject(projectId: string) { return this.del(`/projects/${projectId}`) }

  // ── EPISODES ──────────────────────────────────────────────

  async getEpisodes(projectId: string) {
    return this.get<EpisodeOut[]>('/episodes', { projectId })
  }
  async getEpisode(projectId: string, episodeId: string) {
    return this.get<EpisodeFullOut>(`/episodes/${episodeId}`)
  }
  async createEpisode(projectId: string, data: { episodeNumber: number; title?: string; name?: string; bibleText?: string }) {
    return this.post<EpisodeOut>('/episodes', { projectId, ...data })
  }
  async updateEpisode(projectId: string, episodeId: string, data: { title?: string; name?: string; episodeNumber?: number; bibleText?: string }) {
    return this.put<EpisodeOut>(`/episodes/${episodeId}`, data)
  }
  async deleteEpisode(projectId: string, episodeId: string) {
    return this.del(`/episodes/${episodeId}`)
  }

  // ── EPISODES — Characters / Locations (episode-level aggregation) ──

  async getEpisodeCharacters(episodeId: string) {
    return this.get<CharacterOut[]>(`/episodes/${episodeId}/characters`)
  }

  async getEpisodeLocations(episodeId: string) {
    return this.get<LocationOut[]>(`/episodes/${episodeId}/locations`)
  }

  // ── PARTS ─────────────────────────────────────────────────

  async getParts(projectId: string, episodeId: string) {
    return this.get<PartOut[]>('/parts', { episodeId })
  }
  async getPart(projectId: string, episodeId: string, partId: string) {
    return this.get<PartOut>(`/parts/${partId}`)
  }
  async createPart(projectId: string, episodeId: string, data: { title: string; partNumber: number; scriptText?: string; templateVersionId?: string }) {
    return this.post<PartOut & { executionId?: string }>('/parts', { episodeId, ...data })
  }
  async updatePart(projectId: string, episodeId: string, partId: string, data: { title?: string; partNumber?: number }) {
    return this.put<PartOut>(`/parts/${partId}`, data)
  }
  async updateScript(projectId: string, episodeId: string, partId: string, scriptText: string) {
    return this.put(`/parts/${partId}/script`, { scriptText })
  }
  async deletePart(projectId: string, episodeId: string, partId: string) {
    return this.del(`/parts/${partId}`)
  }

  // ── WORKFLOWS — Executions ────────────────────────────────

  async listWorkflows(params?: { limit?: number; skip?: number; status?: string }) {
    return this.get<ExecutionListResponse>('/workflows', {
      ...(params?.limit != null && { limit: String(params.limit) }),
      ...(params?.skip != null && { skip: String(params.skip) }),
      ...(params?.status && { status: params.status }),
    })
  }

  async getWorkflowStatus(executionId: string) {
    return this.get<ExecutionStatus>(`/workflows/${executionId}`)
  }

  async getWorkflowByPart(partId: string) {
    return this.get<ExecutionStatus>(`/workflows/by-part/${partId}`)
  }

  async deleteWorkflow(executionId: string) { return this.del(`/workflows/${executionId}`) }

  // ── WORKFLOWS — Steps ─────────────────────────────────────

  async getStepData(executionId: string, stepKey: string) {
    return this.get<StepData>(`/workflows/${executionId}/steps/${stepKey}`)
  }

  async getStepHistory(executionId: string, stepKey: string) {
    return this.get<StepHistoryEntry[]>(`/workflows/${executionId}/steps/${stepKey}/history`)
  }

  // ── WORKFLOWS — Step Edit (creates new version, never overwrites) ─────

  async editStep(executionId: string, stepKey: string, data: Record<string, any>, opts?: { org_id?: string; project_id?: string; episode_id?: string; part_id?: string }) {
    return this.post<StepEditResult>(`/workflows/${executionId}/steps/${stepKey}/edit`, { data, ...opts })
  }

  // ── WORKFLOWS — Step Iterate (refine with prompt → new version + SQS) ─────

  async iterateStep(executionId: string, stepKey: string, prompt: string, opts?: { org_id?: string; project_id?: string; episode_id?: string; part_id?: string }) {
    return this.post<IterateStepResult>(`/workflows/${executionId}/steps/${stepKey}/iterate`, { prompt, ...opts })
  }

  // ── WORKFLOWS — Messages ──────────────────────────────────

  async getMessages(executionId: string, stepKey?: string) {
    const params: Record<string, string> = {}
    if (stepKey) params.step_key = stepKey
    return this.get<MessageOut[]>(`/workflows/${executionId}/messages`, params)
  }

  async sendMessage(executionId: string, data: { step_key?: string[]; action?: string; prompt?: string; data?: any; org_id?: string; project_id?: string; episode_id?: string; part_id?: string }) {
    return this.post<MessageOut>(`/workflows/${executionId}/messages`, data)
  }

  // ── TEMPLATES ─────────────────────────────────────────────

  async getTemplates() {
    return this.get<Array<{ id: string; version: number; workflow_template_id: string | null; steps: Array<{ key: string; order: number }>; created_at: string }>>('/workflows/templates')
  }

  // ── STEP VERSION BY ID ────────────────────────────────────

  async getStepVersionById(versionId: string) {
    return this.get<StepData>(`/workflows/step-versions/${versionId}`)
  }

  // ── STEP GENERATE — trigger step execution ────────────────

  async generateStep(executionId: string, stepKey: string, opts?: { org_id?: string; project_id?: string; episode_id?: string; part_id?: string }) {
    return this.post<{ execution_id: string; step_key: string; status: string }>(
      `/workflows/${executionId}/steps/${stepKey}/generate`, opts ?? {}
    )
  }

  // ── STEP APPROVE — mark step as approved ──────────────────

  async approveStep(executionId: string, stepKey: string, opts?: { org_id?: string; project_id?: string; episode_id?: string; part_id?: string }) {
    return this.post<{ execution_id: string; step_key: string; status: string; next_step_key: string | null; next_step_status: string | null }>(
      `/workflows/${executionId}/steps/${stepKey}/approve`, opts ?? {}
    )
  }

  // ── MEDIA — presigned upload URL ─────────────────────────

  async presignUpload(filename: string, contentType: string, folder = 'workflow-media') {
    return this.post<{ upload_url: string; s3_key: string; public_url: string; cdn_url: string | null }>(
      '/media/presign', { filename, content_type: contentType, folder }
    )
  }

  async confirmUpload(executionId: string, s3Key: string, contentType: string, stepVersionId?: string, sizeBytes?: number) {
    return this.post<{ media_id: string; cdn_url: string | null; storage: any }>(
      '/media/confirm', {
        execution_id: executionId,
        step_version_id: stepVersionId,
        s3_key: s3Key,
        content_type: contentType,
        size_bytes: sizeBytes,
        type: 'image',
        role: 'final',
      }
    )
  }

  async deleteMedia(mediaId: string) {
    return this.del<{ deleted: boolean; media_id: string }>(`/media/${mediaId}`)
  }

  // ── STEP IMAGES — patch in-place (delete / reorder / add uploaded URL) ─────

  async patchStepImages(executionId: string, stepKey: string, s3Uris: string[], artifactRefs?: Record<string, string[]>) {
    return this.patch<{ step_version_id: string; version_no: number; s3_uris_count: number }>(
      `/workflows/${executionId}/steps/${stepKey}/images`,
      { s3_uris: s3Uris, artifact_refs: artifactRefs ?? null }
    )
  }

  // ── SHOTS / CLIPS — independent collections ──────────────

  async getWorkflowShots(executionId: string, params?: { part_id?: string; latest_only?: boolean }) {
    return this.get<ShotOut[]>(`/workflows/${executionId}/shots`, {
      ...(params?.part_id ? { part_id: params.part_id } : {}),
      ...(params?.latest_only != null ? { latest_only: String(params.latest_only) } : {}),
    })
  }

  async getWorkflowClips(executionId: string, params?: { part_id?: string; latest_only?: boolean }) {
    return this.get<ClipOut[]>(`/workflows/${executionId}/clips`, {
      ...(params?.part_id ? { part_id: params.part_id } : {}),
      ...(params?.latest_only != null ? { latest_only: String(params.latest_only) } : {}),
    })
  }

  async getWorkflowCharacters(executionId: string, params?: { part_id?: string; latest_only?: boolean }) {
    return this.get<CharacterOut[]>(`/workflows/${executionId}/characters`, {
      ...(params?.part_id ? { part_id: params.part_id } : {}),
      ...(params?.latest_only != null ? { latest_only: String(params.latest_only) } : {}),
    })
  }

  async getWorkflowLocations(executionId: string, params?: { part_id?: string; latest_only?: boolean }) {
    return this.get<LocationOut[]>(`/workflows/${executionId}/locations`, {
      ...(params?.part_id ? { part_id: params.part_id } : {}),
      ...(params?.latest_only != null ? { latest_only: String(params.latest_only) } : {}),
    })
  }

  /** Edit a shot → creates a new version. Returns the updated ShotOut. */
  async updateShot(
    executionId: string,
    shotId: string,
    data: {
      oneLinerShotIntent?: string
      startImagePrompt?: string
      isApproved?: boolean
      shotMetadata?: { shotNumber: number; beatNumber?: number | null }
      characterReferences?: Array<{ characterId?: string; referenceImage?: string; displayName: string; awsUrl: string }>
      locationReferences?: Array<{ locationId?: string; referenceImage?: string; displayName: string; awsUrl: string }>
    },
  ) {
    return this.patch<ShotOut>(`/workflows/${executionId}/shots/${shotId}`, {
      one_liner_shot_intent: data.oneLinerShotIntent,
      start_image_prompt:    data.startImagePrompt,
      is_approved:           data.isApproved,
      shot_metadata:         data.shotMetadata,
      character_references:  data.characterReferences,
      location_references:   data.locationReferences,
    })
  }

  /** Edit a clip → creates a new version. Returns the updated ClipOut. */
  async updateClip(
    executionId: string,
    clipId: string,
    data: {
      animationPrompt?: string
      isApproved?: boolean
      inputImages?: Array<{ objectId?: string; displayName: string; awsUrl: string }>
    },
  ) {
    return this.patch<ClipOut>(`/workflows/${executionId}/clips/${clipId}`, {
      animation_prompt: data.animationPrompt,
      is_approved:      data.isApproved,
      input_images:     data.inputImages,
    })
  }

  /** All versions of a shot (oldest first). */
  async getShotVersions(executionId: string, shotId: string) {
    return this.get<ShotOut[]>(`/workflows/${executionId}/shots/${shotId}/versions`)
  }

  /** All versions of a clip (oldest first). */
  async getClipVersions(executionId: string, clipId: string) {
    return this.get<ClipOut[]>(`/workflows/${executionId}/clips/${clipId}/versions`)
  }

  /** Approve a specific Shot version doc (by its _id). Multiple versions per shotId can be approved. */
  async approveShot(executionId: string, shotDocId: string) {
    return this.post<ShotOut>(`/workflows/${executionId}/shots/${shotDocId}/approve`, {})
  }

  /** Remove approval from a specific Shot version doc (by its _id). */
  async unapproveShot(executionId: string, shotDocId: string) {
    return this.post<ShotOut>(`/workflows/${executionId}/shots/${shotDocId}/unapprove`, {})
  }

  /** Iterate a shot: send instruction to refine the shot image. */
  async iterateShot(
    executionId: string,
    shotDocId: string,
    instruction: string,
    opts?: { shot_number?: number; start_image?: string; org_id?: string; project_id?: string; episode_id?: string; part_id?: string },
  ) {
    return this.post<{ status: string; message_id: string; sqs_message_id?: string; shot_id: string; action: string }>(
      `/workflows/${executionId}/shots/${shotDocId}/iterate`,
      { instruction, ...opts },
    )
  }

  /** Retry a shot: re-generate with existing references. */
  async retryShot(
    executionId: string,
    shotDocId: string,
    opts?: { shot_number?: number; start_image_prompt?: string; character_references?: string[]; location_references?: string[]; previous_references?: string[]; org_id?: string; project_id?: string; episode_id?: string; part_id?: string },
  ) {
    return this.post<{ status: string; message_id: string; sqs_message_id?: string; shot_id: string; action: string }>(
      `/workflows/${executionId}/shots/${shotDocId}/retry`,
      { ...opts },
    )
  }

  /** Approve a specific Clip version doc (by its _id). Un-approves all sibling versions. */
  async approveClip(executionId: string, clipDocId: string) {
    return this.post<ClipOut>(`/workflows/${executionId}/clips/${clipDocId}/approve`, {})
  }
}

export const apiClient = new ApiClient()

