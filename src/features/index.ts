// Features barrel export
// Main Generate component
export { default as Generate } from './Generate';

// Sub-features. Use the explicit index path so case-insensitive file systems
// do not confuse the `generate/` folder with `Generate.jsx`.
export * from './generate/index';
