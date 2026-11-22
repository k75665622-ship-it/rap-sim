// Lets the world ask the story host to open a scene (walking up to someone).
export const storyBus: { handler: ((node: string) => void) | null; request: (node: string) => void } = {
  handler: null,
  request(node) { storyBus.handler?.(node); },
};
