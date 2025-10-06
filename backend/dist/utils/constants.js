"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectTypes = exports.DrawingActions = exports.UserRoles = exports.SocketEvents = void 0;
var SocketEvents;
(function (SocketEvents) {
    // Connection events
    SocketEvents["JOIN_ROOM"] = "join_room";
    SocketEvents["LEAVE_ROOM"] = "leave_room";
    SocketEvents["USER_JOINED"] = "user_joined";
    SocketEvents["USER_LEFT"] = "user_left";
    SocketEvents["USER_COUNT"] = "user_count";
    // Drawing events
    SocketEvents["DRAWING_EVENT"] = "drawing_event";
    SocketEvents["CANVAS_CLEARED"] = "canvas_cleared";
    SocketEvents["CANVAS_STATE"] = "canvas_state";
    // User interaction events
    SocketEvents["CURSOR_MOVE"] = "cursor_move";
    // Chat events
    SocketEvents["CHAT_MESSAGE"] = "chat:message";
    // System events
    SocketEvents["ERROR"] = "error";
})(SocketEvents || (exports.SocketEvents = SocketEvents = {}));
var UserRoles;
(function (UserRoles) {
    UserRoles["USER"] = "user";
    UserRoles["ADMIN"] = "admin";
})(UserRoles || (exports.UserRoles = UserRoles = {}));
var DrawingActions;
(function (DrawingActions) {
    DrawingActions["ADD"] = "add";
    DrawingActions["MODIFY"] = "modify";
    DrawingActions["REMOVE"] = "remove";
    DrawingActions["CLEAR"] = "clear";
})(DrawingActions || (exports.DrawingActions = DrawingActions = {}));
var ObjectTypes;
(function (ObjectTypes) {
    ObjectTypes["PATH"] = "path";
    ObjectTypes["RECT"] = "rect";
    ObjectTypes["CIRCLE"] = "circle";
    ObjectTypes["TEXT"] = "text";
    ObjectTypes["LINE"] = "line";
    ObjectTypes["POLYLINE"] = "polyline";
    ObjectTypes["POLYGON"] = "polygon";
    ObjectTypes["GROUP"] = "group";
})(ObjectTypes || (exports.ObjectTypes = ObjectTypes = {}));
//# sourceMappingURL=constants.js.map