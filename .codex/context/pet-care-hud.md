# Pet Care HUD And Actions

Read before changing the home status display or bottom care actions. Apply existing Expo design, responsive layout, and component separation rules.

## Scope

- Care meters are functional local state and are persisted with the goal planner data.
- Use the actual selected pet and current growth-stage image from the home room. Pet selection must also update the portrait.
- Components: src/screens/home/components/PetCareOverlay.tsx. The home screen supplies the pet and composes the overlays.

## User-Requested Design

- Show the pet inside a compact square pixel portrait with subtly clipped corners and a thin cocoa outline. Do not restore the circular experience ring.
- Crop and position the pet portrait by the visual center of the eyes, nose, and mouth, not by the outer image bounds. Keep that facial-feature center aligned to the center of the square frame for every pet and growth stage.
- Place three segmented horizontal meters alongside it: cleanliness, hunger, loneliness, using the established status icons in that order.
- Show only gold currency; omit the blue premium currency from this HUD.
- Bottom actions: 청소하기, 밥먹이기, 놀아주기.
- Preserve Galmuri11 typography, warm cream surfaces, brown outlines, and gentle pastel accents.
- Pixel-art icons are handled separately. Reuse existing pet images and draw frames/meters in code. Keep temporary text labels; do not generate new raster icons.
- A care action opens the matching owned-item flow. Successfully consuming food, play, or cleaning items must immediately increase the corresponding top meter by the catalog effect and persist the new value.
- Keep accessible names and disabled states on care controls.

## Layout And Follow-Up

- Respect the home safe area. Keep status clear of side rails and actions clear of the room character and popup layers.
- Use flexible gauge widths and equal-width bottom buttons without horizontal overflow. Bound desktop control width.
- Filled meter values represent positive condition: cleanliness, fullness, and companionship. Care actions increase the matching positive value.
- Preserve the nine-cell pixel layout, but render fractional fill inside a cell so every valid care increase is visibly reflected instead of disappearing through segment rounding.
- Follow the user's current verification preference: inspect code errors, but do not run automated tests or interact with devices unless requested. Report unverified visual behavior.

## Portrait And Button Refinement

- Enlarge and clip the existing pet image to emphasize its face. Preserve the square portrait frame and tune per-image offsets when needed so the facial features remain centered.
- Bottom buttons show only full action names, without separate 청/굶/외 letters. Keep these abbreviations beside the top meters only.
