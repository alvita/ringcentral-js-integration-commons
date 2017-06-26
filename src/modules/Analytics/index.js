import RcModule from '../../lib/RcModule';
import moduleStatuses from '../../enums/moduleStatuses';
import actionTypes from './actionTypes';
import getAnalyticsReducer from './getAnalyticsReducer';

export default class Analytics extends RcModule {
  constructor({
    auth,
    // analytics,
    // appName,
    ...options
  }) {
    super({
      ...options,
      actionTypes
    });
    this._analytics = null;
    this._auth = auth;
    this._reducer = getAnalyticsReducer(this.actionTypes);
  }

  initialize() {
    // this._analytics = !this._analytics || this._initAnalytics();
    console.debug('analytics initialize...', this._analytics);
    // if (this._analytics.initialize) {
    //   this.track();
    // }
    this.store.subscribe(() => this._onStateChange());
  }

  identify({
    userId,
    name,
  }) {
    this._analytics.identify(userId, {
      name
    });
  }

  track({
    event,
    properties
  }) {
    const result = this._analytics.track(event, properties);
    console.log(result);
  }

  trackNavigation({ router }) {
    this.track('Navigator Clicked', {
      router
    });
  }

  async _onStateChange() {
    if (this._shouldInit()) {
      this._analytics = window.analytics;
      this._initModuleStatus();
      if (this._auth.loggedIn && this._auth.isFreshLogin) {
        this.identify({
          userId: this._auth.ownerId
        });
        this.track({
          event: 'Authentication'
        });
      }
    } else if (this._shouldReset()) {
      this._resetModuleStatus();
    }
  }

  _shouldInit() {
    return (
      window.analytics.initialized &&
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
