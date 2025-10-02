import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const collaborativeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Animated drawing demo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 300;

    let animationId: number;
    let progress = 0;

    // Drawing data for animation
    const drawings = [
      // Draw a house
      { type: 'rect', x: 100, y: 150, width: 100, height: 80, color: '#8B5CF6' },
      { type: 'triangle', x1: 90, y1: 150, x2: 150, y2: 100, x3: 210, y3: 150, color: '#F59E0B' },
      { type: 'rect', x: 130, y: 180, width: 20, height: 30, color: '#EF4444' },
      { type: 'circle', x: 170, y: 170, radius: 8, color: '#3B82F6' },
      // Draw some trees
      { type: 'rect', x: 250, y: 180, width: 10, height: 50, color: '#92400E' },
      { type: 'circle', x: 255, y: 170, radius: 25, color: '#059669' },
      { type: 'rect', x: 50, y: 190, width: 8, height: 40, color: '#92400E' },
      { type: 'circle', x: 54, y: 180, radius: 20, color: '#059669' },
      // Add some clouds
      { type: 'circle', x: 320, y: 80, radius: 15, color: '#E5E7EB' },
      { type: 'circle', x: 335, y: 75, radius: 18, color: '#E5E7EB' },
      { type: 'circle', x: 305, y: 75, radius: 12, color: '#E5E7EB' },
    ];

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Background
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const currentDrawingIndex = Math.floor(progress / 30);
      const drawingProgress = (progress % 30) / 30;

      // Draw completed shapes
      for (let i = 0; i < currentDrawingIndex && i < drawings.length; i++) {
        drawShape(ctx, drawings[i], 1);
      }

      // Draw current shape with animation
      if (currentDrawingIndex < drawings.length) {
        drawShape(ctx, drawings[currentDrawingIndex], drawingProgress);
      }

      progress += 0.8;
      if (progress > drawings.length * 30) {
        progress = 0; // Loop the animation
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  // Multi-user simulation
  useEffect(() => {
    const canvas = collaborativeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 300;

    let animationId: number;
    let time = 0;

    const users = [
      { name: 'Alex', color: '#EF4444', cursor: { x: 100, y: 100 } },
      { name: 'Sarah', color: '#3B82F6', cursor: { x: 200, y: 150 } },
      { name: 'Mike', color: '#10B981', cursor: { x: 300, y: 200 } },
    ];

    const paths: { user: number; points: { x: number; y: number }[] }[] = [];

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Background
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update cursor positions with smooth movement
      users.forEach((user, index) => {
        const angle = time * 0.02 + index * 2;
        const centerX = 200 + index * 50;
        const centerY = 150 + index * 20;
        user.cursor.x = centerX + Math.cos(angle) * 80;
        user.cursor.y = centerY + Math.sin(angle) * 60;

        // Add to paths occasionally
        if (Math.random() < 0.3) {
          let userPath = paths.find(p => p.user === index);
          if (!userPath) {
            userPath = { user: index, points: [] };
            paths.push(userPath);
          }
          userPath.points.push({ x: user.cursor.x, y: user.cursor.y });
          
          // Limit path length
          if (userPath.points.length > 50) {
            userPath.points.shift();
          }
        }
      });

      // Draw paths
      paths.forEach(path => {
        if (path.points.length > 1) {
          ctx.strokeStyle = users[path.user].color;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
          ctx.stroke();
        }
      });

      // Draw cursors
      users.forEach(user => {
        // Cursor circle
        ctx.fillStyle = user.color;
        ctx.beginPath();
        ctx.arc(user.cursor.x, user.cursor.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // User name tag
        ctx.fillStyle = '#1F2937';
        ctx.font = '12px Arial';
        ctx.fillText(user.name, user.cursor.x + 12, user.cursor.y - 10);
      });

      time++;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  const drawShape = (ctx: CanvasRenderingContext2D, shape: any, progress: number) => {
    ctx.fillStyle = shape.color;
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = 2;

    switch (shape.type) {
      case 'rect':
        const width = shape.width * progress;
        const height = shape.height * progress;
        ctx.fillRect(shape.x, shape.y, width, height);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, shape.radius * progress, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'triangle':
        const p = progress;
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x1 + (shape.x2 - shape.x1) * p, shape.y1 + (shape.y2 - shape.y1) * p);
        ctx.lineTo(shape.x1 + (shape.x3 - shape.x1) * p, shape.y1 + (shape.y3 - shape.y1) * p);
        ctx.closePath();
        ctx.fill();
        break;
    }
  };

  const steps = [
    "Create or join a room",
    "Start drawing together", 
    "See real-time collaboration",
    "Share and export your work"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [steps.length]);
  return (
    <div className="bg-white">
      {/* Hero section with animated drawing */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 mix-blend-multiply" aria-hidden="true"></div>
        </div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Collaborate in Real-Time with Canvas App
              </h1>
              <p className="mt-6 max-w-2xl text-xl text-indigo-100">
                Watch ideas come to life! Draw, sketch, and brainstorm together in real-time from anywhere in the world.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 sm:gap-6">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 transform transition hover:scale-105"
                >
                  🚀 Start Drawing Now
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-800 bg-opacity-60 hover:bg-opacity-70"
                >
                  Sign In
                </Link>
              </div>
            </div>
            <div className="mt-12 lg:mt-0">
              <div className="bg-white rounded-xl shadow-2xl p-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">🎨 Live Drawing Demo</h3>
                  <p className="text-sm text-gray-500">Watch Canvas App in action!</p>
                </div>
                <canvas
                  ref={canvasRef}
                  className="w-full border-2 border-gray-200 rounded-lg"
                  style={{ maxWidth: '400px', height: '300px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animated collaboration showcase */}
      <div className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gray-900 rounded-xl shadow-2xl p-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-white">👥 Multi-User Collaboration</h3>
                  <p className="text-sm text-gray-300">See live cursors and real-time drawing</p>
                </div>
                <canvas
                  ref={collaborativeCanvasRef}
                  className="w-full border-2 border-gray-600 rounded-lg bg-white"
                  style={{ maxWidth: '400px', height: '300px' }}
                />
                <div className="mt-4 flex justify-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-300">Alex</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-300">Sarah</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-300">Mike</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 mb-12 lg:mb-0">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Real-Time Magic ✨
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                See everyone's cursor movements, drawing strokes, and changes instantly. 
                Collaborate as if you're sitting next to each other!
              </p>
              <div className="mt-8">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">⚡</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900">Instant Synchronization</p>
                    <p className="text-sm text-gray-600">Zero-lag collaboration</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">👀</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900">Live Cursors</p>
                    <p className="text-sm text-gray-600">See where everyone is working</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animated steps section */}
      <div className="py-16 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              How It Works 🚀
            </h2>
            <p className="mt-4 text-xl text-indigo-200">
              Get started in seconds
            </p>
          </div>
          <div className="mt-12 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-6">
                  <span className="text-2xl font-bold text-white">{currentStep + 1}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {steps[currentStep]}
                </h3>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                {steps.map((step, index) => (
                  <div 
                    key={index}
                    className={`text-center p-4 rounded-lg transition-all duration-300 ${
                      index === currentStep 
                        ? 'bg-indigo-100 border-2 border-indigo-500 scale-105' 
                        : 'bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2 ${
                      index <= currentStep ? 'bg-indigo-500 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <p className={`text-sm font-medium ${
                      index === currentStep ? 'text-indigo-700' : 'text-gray-600'
                    }`}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features section with animated cards */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-indigo-600 tracking-wide uppercase">Everything you need</h2>
          <p className="mt-1 text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight">
            Features designed for collaboration
          </p>
          <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
            Powerful tools that make drawing and collaborating a joy
          </p>
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="pt-6 group">
              <div className="flow-root bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg px-6 pb-8 transform transition duration-300 hover:scale-105 hover:shadow-xl">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md shadow-lg group-hover:rotate-6 transition-transform duration-300">
                      <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">⚡ Real-time collaboration</h3>
                  <p className="mt-5 text-base text-gray-600">
                    See live cursors, instant updates, and watch ideas come to life together in real-time.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 group">
              <div className="flow-root bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg px-6 pb-8 transform transition duration-300 hover:scale-105 hover:shadow-xl">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-md shadow-lg group-hover:rotate-6 transition-transform duration-300">
                      <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">🎨 Powerful drawing tools</h3>
                  <p className="mt-5 text-base text-gray-600">
                    Brushes, shapes, colors, and more. Express your creativity with professional-grade tools.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 group">
              <div className="flow-root bg-gradient-to-br from-green-50 to-teal-50 rounded-lg px-6 pb-8 transform transition duration-300 hover:scale-105 hover:shadow-xl">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-green-500 to-teal-600 rounded-md shadow-lg group-hover:rotate-6 transition-transform duration-300">
                      <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">🔐 Private & Public Rooms</h3>
                  <p className="mt-5 text-base text-gray-600">
                    Create secure private rooms for sensitive work or open public spaces for community collaboration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simple CTA section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Ready to start creating?</span>
            <span className="block">🎨 Jump in and start drawing!</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-indigo-200">
            Join the collaborative drawing revolution. No downloads, no setup - just pure creativity.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 transform transition hover:scale-105 hover:shadow-lg"
            >
              🚀 Create Your First Room
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-8 py-3 border border-white text-base font-medium rounded-md text-white bg-transparent hover:bg-white hover:text-indigo-600 transition"
            >
              👋 Sign In
            </Link>
          </div>
          <p className="mt-6 text-sm text-indigo-200">
            Free to use • No credit card required • Start drawing in seconds
          </p>
        </div>
      </div>

    </div>
  );
};

export default HomePage;