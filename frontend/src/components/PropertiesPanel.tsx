import React from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { setBrushColor, setBrushSize } from '../store/slices/canvasSlice';

interface ObjectProperty {
  label: string;
  value: string | number;
  type: 'text' | 'number' | 'color' | 'select';
  options?: string[];
  onChange?: (value: string | number) => void;
}

interface PropertyGroupProps {
  title: string;
  properties: ObjectProperty[];
}

const PropertyGroup: React.FC<PropertyGroupProps> = ({ title, properties }) => (
  <div className="mb-6">
    <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
    <div className="space-y-3">
      {properties.map((prop, index) => {
        const inputId = `property-${title.toLowerCase().replace(/\s+/g, '-')}-${prop.label.toLowerCase().replace(/\s+/g, '-')}-${index}`;
        return (
          <div key={index} className="flex flex-col">
            <label htmlFor={inputId} className="text-xs text-gray-600 mb-1">{prop.label}</label>
            {prop.type === 'text' && (
              <input
                id={inputId}
                type="text"
                value={prop.value}
                onChange={(e) => prop.onChange?.(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                aria-label={prop.label}
              />
            )}
            {prop.type === 'number' && (
              <input
                id={inputId}
                type="number"
                value={prop.value}
                onChange={(e) => prop.onChange?.(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                aria-label={prop.label}
              />
            )}
            {prop.type === 'color' && (
              <input
                id={inputId}
                type="color"
                value={prop.value}
                onChange={(e) => prop.onChange?.(e.target.value)}
                className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                aria-label={prop.label}
              />
            )}
            {prop.type === 'select' && (
              <select
                id={inputId}
                value={prop.value}
                onChange={(e) => prop.onChange?.(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                aria-label={prop.label}
              >
                {prop.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

/**
 * PropertiesPanel component for right sidebar
 * Shows properties of selected objects similar to Figma's properties panel
 */
const PropertiesPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeTool = useAppSelector(state => (state.canvas as any).activeTool) as string;
  const brushSize = useAppSelector(state => (state.canvas as any).brushSize) as number;
  const brushColor = useAppSelector(state => (state.canvas as any).brushColor) as string;

  // Mock selected object for demonstration
  const selectedObject = null; // This would come from canvas selection state

  const getToolProperties = (): ObjectProperty[] => {
    switch (activeTool) {
      case 'pencil':
        return [
          { 
            label: 'Stroke Width', 
            value: brushSize, 
            type: 'number',
            onChange: (value) => dispatch(setBrushSize(value as number))
          },
          { 
            label: 'Stroke Color', 
            value: brushColor, 
            type: 'color',
            onChange: (value) => dispatch(setBrushColor(value as string))
          },
          { 
            label: 'Line Cap', 
            value: 'round', 
            type: 'select', 
            options: ['round', 'square', 'butt'] 
          },
          { 
            label: 'Line Join', 
            value: 'round', 
            type: 'select', 
            options: ['round', 'bevel', 'miter'] 
          }
        ];
      case 'eraser':
        return [
          { 
            label: 'Eraser Size', 
            value: brushSize, 
            type: 'number',
            onChange: (value) => dispatch(setBrushSize(value as number))
          },
          { 
            label: 'Eraser Color', 
            value: brushColor, 
            type: 'color',
            onChange: (value) => dispatch(setBrushColor(value as string))
          }
        ];
      case 'rectangle':
      case 'circle':
        return [
          { 
            label: 'Fill Color', 
            value: brushColor, 
            type: 'color',
            onChange: (value) => dispatch(setBrushColor(value as string))
          },
          { label: 'Stroke Color', value: '#000000', type: 'color' },
          { label: 'Stroke Width', value: 2, type: 'number' },
          { label: 'Opacity', value: 100, type: 'number' }
        ];
      case 'line':
        return [
          { 
            label: 'Stroke Color', 
            value: brushColor, 
            type: 'color',
            onChange: (value) => dispatch(setBrushColor(value as string))
          },
          { 
            label: 'Stroke Width', 
            value: brushSize, 
            type: 'number',
            onChange: (value) => dispatch(setBrushSize(value as number))
          },
          { 
            label: 'Line Style', 
            value: 'solid', 
            type: 'select', 
            options: ['solid', 'dashed', 'dotted'] 
          }
        ];
      case 'text':
        return [
          { label: 'Font Size', value: 16, type: 'number' },
          { 
            label: 'Text Color', 
            value: brushColor, 
            type: 'color',
            onChange: (value) => dispatch(setBrushColor(value as string))
          },
          { 
            label: 'Font Family', 
            value: 'Arial', 
            type: 'select', 
            options: ['Arial', 'Helvetica', 'Times New Roman', 'Courier'] 
          },
          { 
            label: 'Font Weight', 
            value: 'normal', 
            type: 'select', 
            options: ['normal', 'bold', 'lighter'] 
          }
        ];
      default:
        return [];
    }
  };

  const getSelectedObjectProperties = (): ObjectProperty[] => {
    if (!selectedObject) return [];
    
    // This would return properties based on the selected object type
    return [
      { label: 'X Position', value: 100, type: 'number' },
      { label: 'Y Position', value: 100, type: 'number' },
      { label: 'Width', value: 150, type: 'number' },
      { label: 'Height', value: 100, type: 'number' },
      { label: 'Rotation', value: 0, type: 'number' },
      { label: 'Opacity', value: 100, type: 'number' }
    ];
  };

  return (
    <div className="bg-white border-l border-gray-200 w-48 lg:w-64 p-2 lg:p-4 overflow-y-auto">
      <div className="mb-2 lg:mb-4">
        <h2 className="text-base lg:text-lg font-semibold text-gray-800 mb-1 lg:mb-2">Properties</h2>
      </div>

      {/* Tool Properties */}
      <PropertyGroup
        title={`${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} Tool`}
        properties={getToolProperties()}
      />

      {/* Selected Object Properties */}
      {selectedObject && (
        <PropertyGroup
          title="Selected Object"
          properties={getSelectedObjectProperties()}
        />
      )}

      {/* Canvas Properties */}
      <PropertyGroup
        title="Canvas"
        properties={[
          { label: 'Width', value: 800, type: 'number' },
          { label: 'Height', value: 600, type: 'number' },
          { label: 'Background', value: '#ffffff', type: 'color' },
          { label: 'Zoom', value: '100%', type: 'text' }
        ]}
      />

      {/* Layer Information */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Layers</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
            <span>Layer 1</span>
            <div className="flex space-x-1">
              <button className="text-gray-500 hover:text-gray-700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5S21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12S9.24 7 12 7S17 9.24 17 12S14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12S10.34 15 12 15S15 13.66 15 12S13.66 9 12 9Z"/>
                </svg>
              </button>
              <button className="text-gray-500 hover:text-gray-700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <button className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
            Export Canvas
          </button>
          <button className="w-full px-3 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
            Clear Canvas
          </button>
          <button className="w-full px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;