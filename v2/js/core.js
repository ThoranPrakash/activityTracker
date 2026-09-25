// Tiny app core: shared view state, action registry, render hook.
// Buttons use data-a="action" (click); inputs use data-in="action" (input/change).

import { mondayOf, todayKey } from './util.js';

export const view = {
  tab: 'today',
  foodDate: todayKey(),
  progSeg: 'body',
  strengthEx: null,
  reviewWeek: mondayOf(todayKey()),
  weightRange: 30,
};

export const actions = {};
export const register = obj => Object.assign(actions, obj);

let renderFn = () => {};
export const setRender = fn => { renderFn = fn; };
export const render = () => renderFn();
