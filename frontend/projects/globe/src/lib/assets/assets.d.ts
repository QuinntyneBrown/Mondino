// The build's `file` loader (angular.json) turns an imported asset into its hashed address.
declare module '*.glb' {
  const url: string;
  export default url;
}
declare module '*.png' {
  const url: string;
  export default url;
}
