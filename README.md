# ChordCove Backend

Backend service for ChordCove, a sheet sharing website.

## TypeScript Migration

This project has been successfully migrated from JavaScript to TypeScript. The migration was done incrementally, file by file.

### Migration Progress

- [x] Set up TypeScript configuration
- [x] Create type definitions for environment variables and external APIs
- [x] Convert core files to TypeScript
- [x] Convert remaining files to TypeScript
- [x] Update import statements to remove .js extensions
- [x] Update build and deployment scripts

### Files Converted

- `src/types/env.ts`
- `src/types/worker-types.d.ts`
- `src/types/models.ts`
- `src/utils/response.ts`
- `src/auth/verifyJWT.ts`
- `src/middleWare/cors.ts`
- `src/middleWare/auth.ts`
- `src/index.ts`
- `src/handleUsers/utils.ts`
- `src/handleUsers/login.ts`
- `src/handleUsers/register.ts`
- `src/handleUsers/registerDirect.ts`
- `src/handleUsers/sendCode.ts`
- `src/sheetEditing/upload.ts`
- `src/sheetEditing/uploadImage.ts`
- `src/sheetEditing/edit.ts`
- `src/getters/getRecentSheets.ts`
- `src/getters/getSheetMetadata.ts`

## Benefits of TypeScript Migration

- **Type Safety**: Catch errors at compile time rather than runtime
- **Better Documentation**: Types serve as documentation for the codebase
- **Improved Developer Experience**: Better IDE support with autocompletion and type checking
- **Easier Maintenance**: Types make refactoring safer and easier
- **Better Collaboration**: Types make it easier for new developers to understand the codebase

## Development

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

```bash
npm install
```

### Running Locally

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

### Deploying

```bash
npm run deploy
```

## Testing

```bash
npm test
```

## Project Structure

```
chordcove-backend/
├── src/
│   ├── auth/                  # Authentication related code
│   ├── handleUsers/           # User management
│   ├── sheetEditing/          # Sheet editing and upload
│   ├── getters/               # Data retrieval
│   ├── middleWare/            # Middleware functions
│   ├── types/                 # TypeScript type definitions
│   ├── utils/                 # Helper functions
│   └── index.ts               # Main application entry point
├── tests/                     # Test files
└── ...
``` 