/**
 * Project data refresh event system
 * 
 * Emit when episodes or parts are created/updated/deleted to trigger sidebar refresh
 */

type ProjectRefreshListener = () => void

class ProjectRefreshEvents {
  private listeners: Set<ProjectRefreshListener> = new Set()

  subscribe(listener: ProjectRefreshListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit() {
    this.listeners.forEach(listener => listener())
  }
}

export const projectRefreshEvents = new ProjectRefreshEvents()

/**
 * Trigger sidebar and project data refresh
 * Call after creating/updating/deleting episodes or parts
 */
export function refreshProjectData() {
  projectRefreshEvents.emit()
}
