import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setActiveTool, setBrushSize, setBrushColor } from '../store/slices/canvasSlice';

type DrawingTool = 'select' | 'pencil' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'triangle' | 'star' | 'polygon' | 'text' | 'pan';

interface ToolButtonProps {
  tool: DrawingTool;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ tool, isActive, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`
      w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200
      ${isActive 
        ? 'bg-blue-500 text-white shadow-md' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
      }
    `}
    title={label}
  >
    {icon}
  </button>
);

/**
 * DrawingToolbar component for left sidebar
 * Provides drawing tools similar to Figma's toolbar
 */
const DrawingToolbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeTool = useAppSelector(state => state.canvas.activeTool);
  const brushSize = useAppSelector(state => state.canvas.brushSize);
  const brushColor = useAppSelector(state => state.canvas.brushColor);

  const handleToolChange = (tool: DrawingTool) => {
    dispatch(setActiveTool(tool));
  };

  const handleBrushSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setBrushSize(parseInt(e.target.value)));
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setBrushColor(e.target.value));
  };

  const tools: Array<{ tool: DrawingTool; icon: React.ReactNode; label: string }> = [
    {
      tool: 'select',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 2L7 17L10 13L14 14L2 2Z" />
        </svg>
      ),
      label: 'Select (V)',
    },
    {
      tool: 'pan',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13,6V11H18V7.75L22.25,12L18,16.25V13H13V18H16.25L12,22.25L7.75,18H11V13H6V16.25L1.75,12L6,7.75V11H11V6H7.75L12,1.75L16.25,6H13Z" />
        </svg>
      ),
      label: 'Pan (H)',
    },
    {
      tool: 'pencil',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" />
        </svg>
      ),
      label: 'Pencil (P)',
    },
    {
      tool: 'eraser',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.24 3.56L4.95 14.85C4.56 15.24 4.56 15.87 4.95 16.26L6.05 17.36C6.44 17.75 7.07 17.75 7.46 17.36L18.75 6.07C19.14 5.68 19.14 5.05 18.75 4.66L17.65 3.56C17.26 3.17 16.63 3.17 16.24 3.56ZM2.81 19.08L6.05 22.32L21.19 7.18L17.95 3.94L2.81 19.08Z" />
        </svg>
      ),
      label: 'Eraser (E)',
    },
    {
      tool: 'rectangle',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        </svg>
      ),
      label: 'Rectangle (R)',
    },
    {
      tool: 'circle',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
        </svg>
      ),
      label: 'Circle (O)',
    },
    {
      tool: 'triangle',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,2 22,20 2,20" />
        </svg>
      ),
      label: 'Triangle (T)',
    },
    {
      tool: 'line',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="7" y1="17" x2="17" y2="7" />
        </svg>
      ),
      label: 'Line (L)',
    },
    {
      tool: 'arrow',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="7" y1="17" x2="17" y2="7" />
          <polyline points="17,7 17,13 11,7" />
        </svg>
      ),
      label: 'Arrow (A)',
    },
    {
      tool: 'star',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" />
        </svg>
      ),
      label: 'Star (S)',
    },
    {
      tool: 'polygon',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5 12,2" />
        </svg>
      ),
      label: 'Polygon (G)',
    },
    {
      tool: 'text',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 4V7H10.5V19H13.5V7H19V4H5Z" />
        </svg>
      ),
      label: 'Text (T)',
    },
  ];

  const colorPresets = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
  ];

  return (
    <div className="bg-white border-r border-gray-200 w-16 flex flex-col items-center py-4 space-y-4">
      {/* Tools Section */}
      <div className="space-y-2">
        {tools.map(({ tool, icon, label }) => (
          <ToolButton
            key={tool}
            tool={tool}
            isActive={activeTool === tool}
            onClick={() => handleToolChange(tool)}
            icon={icon}
            label={label}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="w-8 border-t border-gray-300" />

      {/* Brush Size */}
      <div className="flex flex-col items-center space-y-2">
        <div className="text-xs text-gray-500 font-medium">Size</div>
        <input
          type="range"
          min="1"
          max="50"
          value={brushSize}
          onChange={handleBrushSizeChange}
          className="w-12 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer transform rotate-90"
        />
        <div className="text-xs text-gray-600">{brushSize}</div>
      </div>

      {/* Divider */}
      <div className="w-8 border-t border-gray-300" />

      {/* Color Picker */}
      <div className="flex flex-col items-center space-y-2">
        <div className="text-xs text-gray-500 font-medium">Color</div>
        
        {/* Current Color Display */}
        <div
          className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer"
          style={{ backgroundColor: brushColor }}
          title="Current Color"
        />

        {/* Color Input */}
        <input
          type="color"
          value={brushColor}
          onChange={handleColorChange}
          className="w-8 h-6 border-none cursor-pointer"
          title="Pick Color"
        />

        {/* Color Presets */}
        <div className="grid grid-cols-2 gap-1 mt-2">
          {colorPresets.map((color) => (
            <button
              key={color}
              onClick={() => dispatch(setBrushColor(color))}
              className={`
                w-3 h-3 rounded border cursor-pointer transition-transform hover:scale-110
                ${brushColor === color ? 'border-blue-500 border-2' : 'border-gray-300'}
              `}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DrawingToolbar;