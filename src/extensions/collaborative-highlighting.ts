import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

interface CollaborativeHighlightingOptions {
  others: ReadonlyArray<{
    id: string;
    presence: {
      cursor: { x: number; y: number } | null;
      selection: {
        from: number;
        to: number;
        color: string;
      } | null;
    };
    info?: {
      name?: string;
      avatar?: string;
      color?: string;
    };
  }>;
}

// Helper function to check if selections overlap
const isOverlapping = (
  selection1: { from: number; to: number }, 
  selection2: { from: number; to: number }
): boolean => {
  return !(selection1.to <= selection2.from || selection2.to <= selection1.from);
};

// Helper function to convert hex color to rgba with transparency
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const CollaborativeHighlighting = Extension.create<CollaborativeHighlightingOptions>({
  name: 'collaborativeHighlighting',

  addOptions() {
    return {
      others: [],
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    
    return [
      new Plugin({
        key: new PluginKey('collaborativeHighlighting'),
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr) {
            // Update decorations based on others' selections
            const decorations: Decoration[] = [];
            
            options.others.forEach((user) => {
              if (user.presence.selection) {
                const { from, to } = user.presence.selection;
                
                // Validate positions
                if (from >= 0 && to >= from && to <= tr.doc.content.size) {
                  // Check for overlapping selections and handle conflicts
                  const hasConflict = options.others.some((otherUser) => 
                    otherUser.id !== user.id && 
                    otherUser.presence.selection &&
                    isOverlapping(otherUser.presence.selection, { from, to })
                  );

                  // Use the user's actual color with appropriate transparency
                  const userColor = user.info?.color || '#3B82F6';
                  const backgroundColor = hasConflict 
                    ? 'rgba(255, 165, 0, 0.2)' // Conflict color - orange with low opacity
                    : hexToRgba(userColor, 0.15); // User's color with very light opacity
                  
                  const borderColor = hasConflict 
                    ? '#FF6B35' // Stronger orange for conflict border
                    : userColor; // User's full color for border

                  // Create decoration with conflict handling
                  const decoration = Decoration.inline(from, to, {
                    class: hasConflict ? 'collaborative-highlight-conflict' : 'collaborative-highlight',
                    style: `background-color: ${backgroundColor}; border-bottom: 2px solid ${borderColor};`,
                    title: `${user.info?.name || 'User'} selected this text${hasConflict ? ' (conflicted)' : ''}`
                  });

                  decorations.push(decoration);
                }
              }
            });

            return DecorationSet.create(tr.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
}); 