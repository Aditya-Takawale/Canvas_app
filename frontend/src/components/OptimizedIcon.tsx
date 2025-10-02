import React, { Suspense, lazy } from 'react';

// Define icon types for better tree shaking
export type IconName = 
  | 'FaUser' 
  | 'FaLock' 
  | 'FaEye' 
  | 'FaEyeSlash' 
  | 'FaSignInAlt' 
  | 'FaUserPlus'
  | 'FaHome'
  | 'FaPlus'
  | 'FaTrash'
  | 'FaEdit'
  | 'FaSave'
  | 'FaDownload'
  | 'FaUpload'
  | 'FaCopy'
  | 'FaCut'
  | 'FaPaste'
  | 'FaUndo'
  | 'FaRedo'
  | 'FaSearchPlus'
  | 'FaSearchMinus'
  | 'FaSearch'
  | 'FaCog'
  | 'FaSignOutAlt'
  | 'FaPalette'
  | 'FaSquare'
  | 'FaCircle'
  | 'FaPen'
  | 'FaEraser'
  | 'FaFont'
  | 'FaImage'
  | 'FaLayerGroup'
  | 'FaMousePointer'
  | 'FaCrosshairs'
  | 'FaBrush'
  | 'FaVectorSquare'
  | 'FaShapes'
  | 'FaGripHorizontal'
  | 'FaExpand'
  | 'FaCompress'
  | 'FaRuler'
  | 'FaUnlock';

// Lazy load only the icons we actually use
const iconMap = {
  FaUser: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaUser }))),
  FaLock: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaLock }))),
  FaEye: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaEye }))),
  FaEyeSlash: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaEyeSlash }))),
  FaSignInAlt: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaSignInAlt }))),
  FaUserPlus: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaUserPlus }))),
  FaHome: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaHome }))),
  FaPlus: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaPlus }))),
  FaTrash: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaTrash }))),
  FaEdit: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaEdit }))),
  FaSave: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaSave }))),
  FaDownload: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaDownload }))),
  FaUpload: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaUpload }))),
  FaCopy: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaCopy }))),
  FaCut: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaCut }))),
  FaPaste: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaPaste }))),
  FaUndo: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaUndo }))),
  FaRedo: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaRedo }))),
  FaSearchPlus: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaSearchPlus }))),
  FaSearchMinus: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaSearchMinus }))),
  FaSearch: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaSearch }))),
  FaCog: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaCog }))),
  FaSignOutAlt: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaSignOutAlt }))),
  FaPalette: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaPalette }))),
  FaSquare: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaSquare }))),
  FaCircle: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaCircle }))),
  FaPen: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaPen }))),
  FaEraser: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaEraser }))),
  FaFont: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaFont }))),
  FaImage: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaImage }))),
  FaLayerGroup: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaLayerGroup }))),
  FaMousePointer: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaMousePointer }))),
  FaCrosshairs: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaCrosshairs }))),
  FaBrush: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaBrush }))),
  FaVectorSquare: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaVectorSquare }))),
  FaShapes: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaShapes }))),
  FaGripHorizontal: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaGripHorizontal }))),
  FaExpand: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaExpand }))),
  FaCompress: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaCompress }))),
  FaRuler: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaRuler }))),
  FaUnlock: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaUnlock }))),
};

interface OptimizedIconProps {
  name: IconName;
  className?: string;
  size?: number;
  color?: string;
  onClick?: () => void;
  title?: string;
}

// Simple fallback icon while loading
const IconFallback: React.FC<{ size?: number; className?: string }> = ({ 
  size = 16, 
  className = '' 
}) => (
  <div 
    className={`inline-block bg-gray-300 rounded ${className}`}
    style={{ width: size, height: size }}
  />
);

const OptimizedIcon: React.FC<OptimizedIconProps> = ({ 
  name, 
  className = '', 
  size = 16, 
  color,
  onClick,
  title 
}) => {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in optimized icon map`);
    return <IconFallback size={size} className={className} />;
  }

  return (
    <Suspense fallback={<IconFallback size={size} className={className} />}>
      <IconComponent
        size={size}
        color={color}
        className={className}
        onClick={onClick}
        title={title}
      />
    </Suspense>
  );
};

// Export commonly used icon bundles for preloading
export const preloadIconBundle = async (iconNames: IconName[]) => {
  const promises = iconNames.map(name => {
    const IconComponent = iconMap[name];
    if (IconComponent) {
      return IconComponent; // This will trigger the lazy loading
    }
    return Promise.resolve();
  });
  
  await Promise.allSettled(promises);
};

// Common icon bundles for different features
export const ICON_BUNDLES = {
  auth: ['FaUser', 'FaLock', 'FaEye', 'FaEyeSlash', 'FaSignInAlt', 'FaUserPlus'] as IconName[],
  canvas: ['FaPalette', 'FaSquare', 'FaCircle', 'FaPen', 'FaEraser', 'FaFont', 'FaImage', 'FaLayerGroup'] as IconName[],
  toolbar: ['FaSave', 'FaDownload', 'FaUpload', 'FaCopy', 'FaCut', 'FaPaste', 'FaUndo', 'FaRedo'] as IconName[],
  navigation: ['FaHome', 'FaPlus', 'FaSearch', 'FaCog', 'FaSignOutAlt'] as IconName[],
};

export default OptimizedIcon;