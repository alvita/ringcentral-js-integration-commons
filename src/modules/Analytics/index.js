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
    adapter,
    router,
    analyticsKey,
    appName,
    appVersion,
    brandCode,
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
    this._adapter = adapter;
    this._router = router;
    this._appVersion = appVersion;
    this._brandCode = brandCode;
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
      appVersion: this._appVersion,
      brand: this._brandCode,
      ...properties,
    };
    global.analytics.track(event, trackProps);
  }

  trackNavigation({ router, eventPostfix }) {
    const trackProps = {
      router,
      appName: this._appName,
      appVersion: this._appVersion,
      brand: this._brandCode,
    };
    this.track(`Navigator Clicked (${eventPostfix})`, {
      trackProps
    });
  }

  async _onStateChange() {
    if (this.ready) {
      this.lastActions.forEach((action) => {
        [
          '_authentication',
          '_logout',
          '_callAttempt',
          '_callConnected',
          '_webRTCRegistration',
          '_smsAttempt',
          '_smsSent',
          '_logCall',
          '_logSMS',
          '_clickToDial',
          '_clickToSMS',
          '_viewEntity',
          '_createEntity',
          '_editCallLog',
          '_editSMSLog',
          '_navigate',
        ].forEach((key) => {
          this[key](action.type);
        });
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

  _callConnected(actionType) {
    if (this._call && this._call.actionTypes.connectSuccess === actionType) {
      this.track({
        event: 'Outbound Call Connected',
      });
    }
  }

  _webRTCRegistration(actionType) {
    if (this._webphone && this._webphone.actionTypes.registered === actionType) {
      this.track({
        event: 'WebRTC registration',
      });
    }
  }

  _smsAttempt(actionType) {
    if (this._messageSender && this._messageSender.actionTypes.send === actionType) {
      this.track({
        event: 'SMS Attempt',
      });
    }
  }

  _smsSent(actionType) {
    if (this._messageSender && this._messageSender.actionTypes.sendOver === actionType) {
      this.track({
        event: 'SMS Sent',
      });
    }
  }

  _logCall(actionType) {
    if (this._adapter && this._adapter.actionTypes.createCallLog === actionType) {
      this.track({
        event: 'Log Call'
      });
    }
  }

  _logSMS(actionType) {
    if (this._adapter && this._adapter.actionTypes.createSMSLog === actionType) {
      this.track({
        event: 'Log SMS'
      });
    }
  }

  _clickToDial(actionType) {
    if (this._adapter && this._adapter.actionTypes.clickToDial === actionType) {
      this.track({
        event: 'Click To Dial'
      });
    }
  }

  _clickToSMS(actionType) {
    if (this._adapter && this._adapter.actionTypes.clickToSMS === actionType) {
      this.track({
        event: 'Click To SMS'
      });
    }
  }

  _viewEntity(actionType) {
    if (this._adapter && this._adapter.actionTypes.viewEntity === actionType) {
      this.track({
        event: 'View Entity Details'
      });
    }
  }

  _createEntity(actionType) {
    if (this._adapter && this._adapter.actionTypes.createEntity === actionType) {
      this.track({
        event: 'Add Entity'
      });
    }
  }

  _editCallLog(actionType) {
    if (this._adapter && this._adapter.actionTypes.editCallLog === actionType) {
      this.track({
        event: 'Edit Call Log'
      });
    }
  }

  _editSMSLog(actionType) {
    if (this._adapter && this._adapter.actionTypes.editSMSLog === actionType) {
      this.track({
        event: 'Edit SMS Log'
      });
    }
  }

  _navigate(action) {
    if (this._router && this._router.locationChange === action.type) {
      const path = action.payload && action.payload.pathname;
      const target = this._getTrackTarget(path);
      if (target) {
        this.trackNavigation({
          ...target
        });
      }
    }
  }

  _getTrackTarget(path) {
    if (path) {
      const targets = [{
        eventPostfix: 'Dialer',
        router: '/',
      }, {
        eventPostfix: 'Compose SMS',
        router: '/composeText',
      }, {
        eventPostfix: 'Messages',
        router: '/messages',
      }, {
        eventPostfix: 'Conversation',
        router: '/conversation/',
      }, {
        eventPostfix: 'Call History',
        router: '/history',
      }, {
        eventPostfix: 'Settings',
        router: '/settings',
      }];
      return targets.find(target => path.indexOf(target.router) !== -1);
    }
    return undefined;
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
