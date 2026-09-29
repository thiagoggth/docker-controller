export async function closeWindowAfterStreamCleanup(
  closeStreams: () => Promise<void>,
  destroyWindow: () => void,
): Promise<void> {
  try {
    await closeStreams();
  } catch {
    // Cleanup failure must not prevent the application window from closing.
  } finally {
    destroyWindow();
  }
}
