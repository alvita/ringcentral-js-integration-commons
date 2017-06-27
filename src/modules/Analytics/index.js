import RcModule from '../../lib/RcModule';
import moduleStatuses from '../../enums/moduleStatuses';
import actionTypes from './actionTypes';
import getAnalyticsReducer from './getAnalyticsReducer';

import { Segment } from '../../lib/Analytics';


export default class Analytics extends RcModule {
  constructor({
    auth,
    call,
    webphone,
    contacts,
    messageSender,
    analyticsKey,
    appName,
    ...options
  }) {
    super({
      ...options,
      actionTypes
    });
    this._auth = auth;
    this._call = call;
    this._webphone = webphone;
    this._contacts = contacts;
    this._messageSender = messageSender;
    this._analyticsKey = analyticsKey;
    this._appName = appName;
    this._reducer = getAnalyticsReducer(this.actionTypes);
    this._segment = Segment();
    this._segment.load(this._analyticsKey);
    this._segment.page();
  }

  initialize() {
    this.store.subscribe(() => this._onStateChange());
  }

  identify({
    userId,
    name,
  }) {
    global.analytics.identify(userId, {
      name
    });
  }

  track({
    event,
    properties
  }) {
    const trackProps = {
      appName: this._appName,
      ...properties,
    };
    const result = global.analytics.track(event, trackProps);
    console.log(result);
  }

  trackNavigation({ router }) {
    this.track('Navigator Clicked', {
      router
    });
  }

  async _onStateChange() {
    console.debug('in analytics', this.lastActions);
    if (this.ready) {
      this.lastActions.forEach((action) => {
        [
          '_authentication',
          '_logout',
          '_callAttempt',
          '_callConnected',
          '_smsAttempt',
          '_smsSent',
        ].forEach((key) => {
          this[key](action.type);
        });
        // this._authentication(action.type);
        // this._callAttempt(action.type);
        // this._callConnected(action.type);
      });
      if (this.lastActions.length !== 0) {
        this.store.dispatch({
          type: this.actionTypes.clear,
        });
      }
    }
  }

  _authentication(actionType) {
    if (this._auth && this._auth.actionTypes.loginSuccess === actionType) {
      this.identify({
        userId: this._auth.ownerId,
      });
      this.track({
        event: 'Authentication',
      });
    }
  }

  _logout(actionType) {
    if (this._auth && this._auth.actionTypes.logout === actionType) {
      this.track({
        event: 'Logout',
      });
    }
  }

  _callAttempt(actionType) {
    if (this._call && this._call.actionTypes.connect === actionType) {
      this.track({
        event: 'Call Attempt',
      });
    }
  }

  // webRTC
  _callConnected(actionType) {
    if (this._webphone && this._webphone.actionTypes.connect === actionType) {
      this.track({
        event: 'Call Connected',
      });
    }
  }

  _smsAttempt(actionType) {
    if (this._messageSender && this.messageSender.actionTypes.send === actionType) {
      this.track({
        event: 'SMS Attempt',
      });
    }
  }

  _smsSent(actionType) {
    if (this._messageSender && this.messageSender.actionTypes.sendOver === actionType) {
      this.track({
        event: 'SMS Sent',
      });
    }
  }

  get analytics() {
    return global.analytics;
  }

  get lastActions() {
    return this.state.lastAction;
  }

  get status() {
    return moduleStatuses.ready;
  }

  get ready() {
    return true;
  }

  get pending() {
    return false;
  }
}
