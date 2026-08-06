"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATEAU_WEEKLY_LEAVE_DAYS = void 0;
exports.validateTeamRotationProfiles = validateTeamRotationProfiles;
exports.reasonBusinessLabel = reasonBusinessLabel;
exports.PLATEAU_WEEKLY_LEAVE_DAYS = [
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
];
function validateTeamRotationProfiles(profiles, config) {
    var _a;
    if ((config === null || config === void 0 ? void 0 : config.rules.weekly_leave_policy.mode) !== 'TEAM_ROTATION') {
        return {
            ready: true,
            missingRotationOrder: [],
            duplicateRotationOrders: [],
            blockers: [],
        };
    }
    const included = profiles.filter((profile) => profile.active && profile.planning_mode !== 'EXCLUDED');
    const missingRotationOrder = included.filter((profile) => profile.rotation_order === null);
    const counts = new Map();
    for (const profile of included) {
        if (profile.rotation_order === null)
            continue;
        counts.set(profile.rotation_order, ((_a = counts.get(profile.rotation_order)) !== null && _a !== void 0 ? _a : 0) + 1);
    }
    const duplicateRotationOrders = [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([order]) => order)
        .sort((a, b) => a - b);
    const blockers = [];
    if (missingRotationOrder.length > 0) {
        blockers.push(`${missingRotationOrder.length} collaborateur(s) inclus n’ont pas d’ordre de rotation.`);
    }
    if (duplicateRotationOrders.length > 0) {
        blockers.push(`Ordres de rotation dupliqués : ${duplicateRotationOrders.join(', ')}.`);
    }
    return {
        ready: blockers.length === 0,
        missingRotationOrder,
        duplicateRotationOrders,
        blockers,
    };
}
function reasonBusinessLabel(source) {
    var _a;
    const labels = {
        FIXED: 'Horaire fixe',
        GENERATED: 'Affectation automatique',
        FILL_REMAINING: 'Affectation des disponibles',
        GUARD_CONTINUATION: 'Fin de garde',
        POST_GUARD_REST: 'Repos après garde',
        WEEKLY_LEAVE: 'Congé hebdomadaire',
        TEMPLATE_REST: 'Repos prévu par le modèle',
        UNASSIGNED: 'Non affecté',
        REST: 'Repos',
    };
    return source ? (_a = labels[source]) !== null && _a !== void 0 ? _a : source : 'Non renseigné';
}
