# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React TypeScript library called `react-gridy-canvas` that provides a flexible grid/canvas layout component with draggable and resizable items. The library is built on top of `react-rnd` and includes features like grid snapping, collision handling, and a selection tool.

## Key Commands

### Development

- `npm run dev` - Start development mode with watch (runs tsup in watch mode)
  - **Note: This is typically already running in another terminal, so you don't need to run it for testing changes**
- `npm run build` - Build the library for production (creates dist folder with ESM/CJS bundles and TypeScript definitions)
- `npm run clean` - Remove build artifacts (dist directory)

### Testing & Quality

- `npm run test` - Run tests with Vitest
- `npm run lint` - Check code formatting with Prettier

### Running a Single Test

- `npx vitest run src/utils/layout-utils.test.ts` - Run a specific test file
- `npx vitest watch src/utils/layout-utils.test.ts` - Run a specific test file in watch mode

### Example Application

The example Vite app is located in `examples/vite/`:

- `cd examples/vite && npm run dev` - Start the example app development server
- `cd examples/vite && npm run build` - Build the example app

## Architecture

### Library Structure (`/src`)

- **`index.ts`** - Main entry point exporting the Grid component and types
- **`types.ts`** - TypeScript type definitions for GridItem, GridProps, and other interfaces
- **`components/layout.tsx`** - Main Grid component implementation using react-rnd
- **`components/styles.css`** - Core CSS styles (bundled into dist/index.css)
- **`utils/`** - Utility functions:
  - `layout-utils.ts` - Core layout calculations (overlap detection, grid snapping)
  - `selection-utils.ts` - Selection tool logic
  - `collision-utils.ts` - Collision detection and item shifting algorithms

### Key Technical Details

- Uses `react-rnd` for drag/resize functionality
- Implements custom grid snapping logic during drag/resize operations
- Collision detection uses bounding box overlap calculations
- Selection tool uses mouse event tracking and rectangle intersection
- Supports per-item collision toggle and locking
- Scale/zoom support with custom transform origin for canvas zooming

### Build Configuration

- **tsup** - TypeScript bundler that creates both ESM and CJS outputs
- Outputs to `/dist` with:
  - `index.js` (CommonJS)
  - `index.mjs` (ES Module)
  - `index.d.ts` (TypeScript definitions)
  - `index.css` (Extracted styles)
- External dependencies: react, react-dom
- CSS is extracted and must be imported by consumers

### Testing Approach

- Vitest for unit testing
- Tests located alongside source files (e.g., `layout-utils.test.ts`)
- No vitest config file - uses default configuration
- Focus on utility function testing (layout calculations, overlap detection)
