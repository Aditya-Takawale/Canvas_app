# Multi-User Simulation Update: Registered Users

## Changes Made

The multi-user simulation functionality has been updated to use only the registered users in the system instead of demo users:

1. **User Configuration**:
   - Replaced the 5 demo users (Alice, Bob, Charlie, Diana, Eve) with the 2 actual registered users:
     - **Admin**: Identified with a crown cursor (👑) and blue color
     - **User**: Identified with a pointing cursor (👆) and green color

2. **Documentation Updates**:
   - Updated keyboard shortcuts in documentation to reflect that only keys 1-2 are used
   - Modified user switching instructions to clarify Admin/User switching
   - Updated all references to the number of users in the system

3. **Visual Identity**:
   - Admin: Blue color with crown emoji
   - User: Green color with standard user icon

## Benefits of This Change

1. **Realistic Simulation**: The simulation now better reflects the actual user structure of your system
2. **Consistency**: User names and roles in the simulation match those in your authentication system
3. **Clearer Testing**: Testing multi-user interactions is more meaningful when using actual user roles

## Usage Instructions

The keyboard shortcuts and user switching functionality remains the same, but with fewer options:

- Press **1** to switch to Admin
- Press **2** to switch to User
- Press **Tab** to cycle between users
- Press **C** to toggle visibility of all cursors

## Future Considerations

If more users are added to the system in the future, the multi-user simulation can be expanded to include them by updating the `DEFAULT_USERS` array in the `multiUser.ts` file.