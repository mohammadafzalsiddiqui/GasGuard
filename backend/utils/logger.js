// For now, we can just re-export console for simplicity, or expand later
export const logger = {
    info: (...args) => console.log("INFO:", ...args),
    error: (...args) => console.error("ERROR:", ...args),
    warn: (...args) => console.warn("WARN:", ...args),
    debug: (...args) => console.log("DEBUG:", ...args), // Can be controlled by an env variable
};