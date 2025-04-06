/**
 * Type declarations for model data
 */

declare module '../data/models.json' {
  interface ModelInfo {
    id: string;
    name: string;
    description: string;
  }

  const models: ModelInfo[];
  export default models;
}
