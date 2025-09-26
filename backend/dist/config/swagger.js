"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Canvas App API',
            version: '1.0.0',
            description: 'Real-Time Collaborative Canvas Drawing Application API',
            contact: {
                name: 'Canvas App Team',
                email: 'support@canvasapp.com',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    required: ['id', 'username', 'email'],
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'The user ID',
                        },
                        username: {
                            type: 'string',
                            description: 'The username',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'The user email',
                        },
                        role: {
                            type: 'string',
                            enum: ['user', 'admin'],
                            description: 'The user role',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Creation timestamp',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Last update timestamp',
                        },
                    },
                },
                Room: {
                    type: 'object',
                    required: ['id', 'name', 'creatorId'],
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'The room ID',
                        },
                        name: {
                            type: 'string',
                            description: 'The room name',
                        },
                        description: {
                            type: 'string',
                            description: 'The room description',
                        },
                        isPrivate: {
                            type: 'boolean',
                            description: 'Whether the room is private',
                        },
                        joinCode: {
                            type: 'string',
                            description: 'Join code for private rooms',
                            nullable: true,
                        },
                        creatorId: {
                            type: 'integer',
                            description: 'ID of the room creator',
                        },
                        canvas: {
                            $ref: '#/components/schemas/Canvas',
                        },
                        creator: {
                            $ref: '#/components/schemas/User',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Creation timestamp',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Last update timestamp',
                        },
                    },
                },
                Canvas: {
                    type: 'object',
                    required: ['id', 'name', 'width', 'height'],
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'The canvas ID',
                        },
                        name: {
                            type: 'string',
                            description: 'The canvas name',
                        },
                        width: {
                            type: 'integer',
                            description: 'Canvas width in pixels',
                        },
                        height: {
                            type: 'integer',
                            description: 'Canvas height in pixels',
                        },
                        state: {
                            type: 'object',
                            description: 'Canvas state as JSON',
                            nullable: true,
                        },
                        roomId: {
                            type: 'integer',
                            description: 'Associated room ID',
                        },
                        creatorId: {
                            type: 'integer',
                            description: 'ID of the canvas creator',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Creation timestamp',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Last update timestamp',
                        },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email',
                        },
                        password: {
                            type: 'string',
                            description: 'User password',
                        },
                    },
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['username', 'email', 'password'],
                    properties: {
                        username: {
                            type: 'string',
                            description: 'Username',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email',
                        },
                        password: {
                            type: 'string',
                            description: 'User password',
                        },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            example: 'success',
                        },
                        message: {
                            type: 'string',
                            example: 'Login successful',
                        },
                        data: {
                            type: 'object',
                            properties: {
                                user: {
                                    $ref: '#/components/schemas/User',
                                },
                                token: {
                                    type: 'string',
                                    description: 'JWT token',
                                },
                            },
                        },
                    },
                },
                CreateRoomRequest: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Room name',
                        },
                        description: {
                            type: 'string',
                            description: 'Room description',
                        },
                        isPrivate: {
                            type: 'boolean',
                            description: 'Whether the room is private',
                            default: false,
                        },
                        width: {
                            type: 'integer',
                            description: 'Canvas width',
                            default: 800,
                        },
                        height: {
                            type: 'integer',
                            description: 'Canvas height',
                            default: 600,
                        },
                    },
                },
                ApiResponse: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            enum: ['success', 'error'],
                        },
                        message: {
                            type: 'string',
                        },
                        data: {
                            type: 'object',
                        },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            example: 'error',
                        },
                        message: {
                            type: 'string',
                            example: 'Error description',
                        },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // paths to files containing OpenAPI definitions
};
const specs = (0, swagger_jsdoc_1.default)(options);
const setupSwagger = (app) => {
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Canvas App API Documentation',
    }));
};
exports.setupSwagger = setupSwagger;
exports.default = specs;
//# sourceMappingURL=swagger.js.map