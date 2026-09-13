const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v)(?:$|[?#])/i;

export function isVideoUrl(url: string) {
  return VIDEO_EXTENSIONS.test(url);
}
