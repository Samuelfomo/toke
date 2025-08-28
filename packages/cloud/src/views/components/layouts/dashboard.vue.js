/// <reference types="../../../../../../node_modules/.vue-global-types/vue_3.5_0.d.ts" />
import { ref, computed } from 'vue';
import { useRouter } from "vue-router";
import { IconShoppingCart } from '@tabler/icons-vue';
import { IconHome } from '@tabler/icons-vue';
import { IconPlanet } from '@tabler/icons-vue';
import { IconBuildingFactory2 } from '@tabler/icons-vue';
import { IconLanguage } from '@tabler/icons-vue';
import { IconFlag } from '@tabler/icons-vue';
import { IconUsersGroup } from '@tabler/icons-vue';
import { IconClipboardText } from '@tabler/icons-vue';
import { IconCalendarDot } from '@tabler/icons-vue';
import { IconSettings } from '@tabler/icons-vue';
import { IconLogout } from '@tabler/icons-vue';
const router = useRouter();
const view = ref(true);
const menuItems = [
    { label: 'Menu', icon: IconHome, route: '/home', roles: ['PARTNER', 'MANAGER'] },
    { label: 'Products', icon: IconShoppingCart, route: '/product', roles: ['MANAGER',] },
    { label: 'Survey', icon: IconCalendarDot, route: '/survey', roles: ['MANAGER'] },
    { label: 'Universe', icon: IconPlanet, route: '/universe', roles: ['PARTNER', 'MANAGER'] },
    { label: 'Sector', icon: IconBuildingFactory2, route: '#', roles: ['PARTNER', 'MANAGER'] },
    { label: 'Lexicon', icon: IconLanguage, route: '/lexicon', roles: ['PARTNER', 'MANAGER'] },
    { label: 'Country', icon: IconFlag, route: '#', roles: ['PARTNER', 'MANAGER'] },
    { label: 'User', icon: IconUsersGroup, route: '#', roles: ['PARTNER', 'MANAGER'] },
];
const configItems = [
    { label: 'Documents', icon: IconClipboardText, route: '#', roles: ['PARTNER', 'MANAGER'] },
    { label: 'Paramètres', icon: IconSettings, route: '#' },
    { label: 'Déconnexion', icon: IconLogout, route: '/' },
];
const filteredMenus = computed(() => {
    // return menuItems.filter(menu => menu.roles.includes(''));
    return menuItems;
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_elements;
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ onMouseover: (...[$event]) => {
            __VLS_ctx.view = false;
            // @ts-ignore
            [view,];
        } },
    ...{ onMouseleave: (...[$event]) => {
            __VLS_ctx.view = true;
            // @ts-ignore
            [view,];
        } },
    ...{ class: " sidebar z-50 h-screen bg-[#283a52] text-white w-16 fixed left-0 top-0 lg:flex hidden flex-col justify-between transition-all duration-300 ease-in-out hover:w-64 group overflow-hidden" },
});
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.router.push('/home');
            // @ts-ignore
            [router,];
        } },
    ...{ class: "logo-section p-4 flex items-center border-b border-[#87D04C] cursor-pointer" },
});
__VLS_asFunctionalElement(__VLS_elements.h1, __VLS_elements.h1)({
    ...{ class: "text-white font-semibold text-center text-xl" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.view) }, null, null);
// @ts-ignore
[view, vShow,];
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center items-center w-full" },
});
__VLS_asFunctionalElement(__VLS_elements.h1, __VLS_elements.h1)({
    ...{ class: "text-white font-semibold text-center text-3xl" },
});
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "menu-section flex-grow" },
});
__VLS_asFunctionalElement(__VLS_elements.ul, __VLS_elements.ul)({
    ...{ class: "py-4 space-y-2" },
});
for (const [item, index] of __VLS_getVForSourceType((__VLS_ctx.filteredMenus))) {
    // @ts-ignore
    [filteredMenus,];
    __VLS_asFunctionalElement(__VLS_elements.li, __VLS_elements.li)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.router.push(item.route);
                // @ts-ignore
                [router,];
            } },
        key: (index),
        ...{ class: "px-3 cursor-pointer transition-transform hover:scale-110 duration-500" },
    });
    __VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
        ...{ class: "flex items-center p-2 rounded-md hover:bg-gray-700 transition-colors duration-200" },
    });
    const __VLS_0 = ((item.icon));
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        stroke: "{1}",
        ...{ class: "w-6 h-6 flex-shrink-0" },
    }));
    const __VLS_2 = __VLS_1({
        stroke: "{1}",
        ...{ class: "w-6 h-6 flex-shrink-0" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({
        ...{ class: "ml-4 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300" },
    });
    (item.label);
}
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "config-section" },
});
__VLS_asFunctionalElement(__VLS_elements.ul, __VLS_elements.ul)({
    ...{ class: "py-4 space-y-2 " },
});
for (const [item, index] of __VLS_getVForSourceType((__VLS_ctx.configItems))) {
    // @ts-ignore
    [configItems,];
    __VLS_asFunctionalElement(__VLS_elements.li, __VLS_elements.li)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.router.push(item.route);
                // @ts-ignore
                [router,];
            } },
        key: (index),
        ...{ class: "px-3 cursor-pointer transition hover:scale-110 duration-500" },
    });
    __VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
        ...{ class: "flex items-center p-2 rounded-md hover:bg-gray-700 transition-colors duration-200" },
    });
    const __VLS_5 = ((item.icon));
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
        stroke: "{1}",
        ...{ class: "w-6 h-6 flex-shrink-0" },
    }));
    const __VLS_7 = __VLS_6({
        stroke: "{1}",
        ...{ class: "w-6 h-6 flex-shrink-0" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({
        ...{ class: "ml-4 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300" },
    });
    (item.label);
}
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['z-50']} */ ;
/** @type {__VLS_StyleScopedClasses['h-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[#283a52]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['w-16']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['left-0']} */ ;
/** @type {__VLS_StyleScopedClasses['top-0']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:flex']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
/** @type {__VLS_StyleScopedClasses['ease-in-out']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:w-64']} */ ;
/** @type {__VLS_StyleScopedClasses['group']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-section']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[#87D04C]']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-0']} */ ;
/** @type {__VLS_StyleScopedClasses['group-hover:opacity-100']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-opacity']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-section']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-grow']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-transform']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:scale-110']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-500']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-gray-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-200']} */ ;
/** @type {__VLS_StyleScopedClasses['w-6']} */ ;
/** @type {__VLS_StyleScopedClasses['h-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-4']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-0']} */ ;
/** @type {__VLS_StyleScopedClasses['group-hover:opacity-100']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-opacity']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
/** @type {__VLS_StyleScopedClasses['config-section']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:scale-110']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-500']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-gray-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-200']} */ ;
/** @type {__VLS_StyleScopedClasses['w-6']} */ ;
/** @type {__VLS_StyleScopedClasses['h-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-4']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-0']} */ ;
/** @type {__VLS_StyleScopedClasses['group-hover:opacity-100']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-opacity']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup: () => ({
        router: router,
        view: view,
        configItems: configItems,
        filteredMenus: filteredMenus,
    }),
});
export default (await import('vue')).defineComponent({});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=dashboard.vue.js.map