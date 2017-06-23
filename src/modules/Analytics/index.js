import RcModule from '../../lib/RcModule';
import moduleStatuses from '../../enums/moduleStatuses';
import actionTypes from './actionTypes';
import getAnalyticsReducer from './getAnalyticsReducer';

export default class Analytics extends RcModule {
  constructor({
    auth,
    initAnalytics,
    analyticsKey,
    // appName,
    ...options
  }) {
    super({
      ...options,
      actionTypes
    });
    // this._initAnalytics = initAnalytics;
    this._analytics = initAnalytics();
    this._analyticsKey = analyticsKey;
    this._auth = auth;
    this._reducer = getAnalyticsReducer(this.actionTypes);
  }

  initialize() {
    // this._analytics = !this._analytics || this._initAnalytics();
    console.debug('analytics initialize...', this._analytics);
    this._analytics.load(this._analyticsKey);
    this._analytics.page();
    this.store.subscribe(() => this._onStateChange());
  }

  track() {
    const result = this._analytics.track('Clicked CTA', {
      location: 'header',
      type: 'button'
    });
    console.log(result);
  }

  async _onStateChange() {
    if (this._shouldInit()) {
      this._initModuleStatus();
    } // else if (this._shouldReset()) {
      // this._resetModuleStatus();
    // }
  }

  _shouldInit() {
    return (
      // this._analytics.initialized &&
      this._auth.ready &&
      this.pending
    );
  }

  _shouldReset() {
    return (
      !this._auth.loggedIn && // loggedIn or beforeLogout
      this.ready
    );
  }

  _initModuleStatus() {
    this.store.dispatch({
      type: this.actionTypes.init,
    });
    this.store.dispatch({
      type: this.actionTypes.initSuccess,
    });
  }

  _resetModuleStatus() {
    this.store.dispatch({
      type: this.actionTypes.reset,
    });
    this.store.dispatch({
      type: this.actionTypes.resetSuccess,
    });
  }

  get status() {
    return this.state.status;
  }

  get ready() {
    return this.state.status === moduleStatuses.ready;
  }

  get pending() {
    return this.state.status === moduleStatuses.pending;
  }
}
