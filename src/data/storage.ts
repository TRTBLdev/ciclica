export const getDataKeys = (userId: string) => ({
  tasks: `ciclica_local_tasks_${userId}`,
  config: `ciclica_local_config_${userId}`,
  history: `ciclica_local_history_${userId}`,
  intentions: `ciclica_local_intentions_${userId}`,
});

export const getLocal = <T>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

export const setLocal = <T>(key: string, val: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error("Local storage save failed", e);
  }
};
