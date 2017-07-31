import 'core-js/fn/array/find';
import RcModule from '../../lib/RcModule';
import moduleStatuses from '../../enums/moduleStatuses';
import actionTypes from './actionTypes';
import callDirections from '../../enums/callDirections';
import getCallMonitorReducer, {
  getCallMatchedReducer
} from './getCallMonitorReducer';
import normalizeNumber from '../../lib/normalizeNumber';
import {
  isRinging,
  hasRingingCalls,
  sortByStartTime,
} from '../../lib/callLogHelpers';
import ensureExist from '../../lib/ensureExist';


export default class CallMonitor extends RcModule {
  constructor({
    call,
    accountInfo,
    detailedPresence,
    activityMatcher,
    contactMatcher,
    webphone,
    onRinging,
    onNewCall,
    onCallUpdated,
    onCallEnded,
    storage,
    ...options
  }) {
    super({
      ...options,
      actionTypes,
    });
    this._call = call;
    this._accountInfo = this::ensureExist(accountInfo, 'accountInfo');
    this._detailedPresence = this::ensureExist(detailedPresence, 'detailedPresence');
    this._contactMatcher = contactMatcher;
    this._activityMatcher = activityMatcher;
    this._webphone = webphone;
    this._onRinging = onRinging;
    this._onNewCall = onNewCall;
    this._onCallUpdated = onCallUpdated;
    this._onCallEnded = onCallEnded;
    this._storage = storage;
    this._callMatchedKey = 'callMatched';

    this._reducer = getCallMonitorReducer(this.actionTypes);

    this._storage.registerReducer({
      key: this._callMatchedKey,
      reducer: getCallMatchedReducer(this.actionTypes),
    });


    this.addSelector('normalizedCalls',
      () => this._detailedPresence.calls,
      () => this._accountInfo.countryCode,
      () => this._webphone && this._webphone.sessions,
      (callsFromPresence, countryCode, sessions) => (
        callsFromPresence.map((call) => {
          // use account countryCode to normalize number due to API issues [RCINT-3419]
          const fromNumber = normalizeNumber({
            phoneNumber: call.from && call.from.phoneNumber,
            countryCode,
          });
          const toNumber = normalizeNumber({
            phoneNumber: call.to && call.to.phoneNumber,
            countryCode,
          });
          let webphoneSession;
          if (sessions && call.sipData) {
            webphoneSession = sessions.find((session) => {
              if (session.direction !== call.direction) {
                return false;
              }
              let remoteUser;
              if (session.direction === callDirections.outbound) {
                remoteUser = session.to;
              } else {
                remoteUser = session.from;
              }
              if (call.sipData.remoteUri.indexOf(remoteUser) === -1) {
                return false;
              }
              const startTime = session.startTime || session.creationTime;
              if (
                call.startTime - startTime > 4000 ||
                session.startTime - startTime > 4000
              ) {
                return false;
              }
              return true;
            });
          }

          return {
            ...call,
            from: {
              phoneNumber: fromNumber,
            },
            to: {
              phoneNumber: toNumber,
            },
            startTime: (
              (webphoneSession && webphoneSession.startTime) ||
              call.startTime
            ),
            webphoneSession,
          };
        }).filter((call) => {
          if (!call.webphoneSession || !sessions) {
            return true;
          }
          const session = sessions.find(
            sessionItem => call.webphoneSession.id === sessionItem.id
          );
          return !!session;
        }).sort(sortByStartTime)
      ),
    );
    this.addSelector('calls',
      this._selectors.normalizedCalls,
      () => (this._contactMatcher && this._contactMatcher.dataMapping),
      () => (this._activityMatcher && this._activityMatcher.dataMapping),
      () => (this.callMatched),
      (normalizedCalls, contactMapping = {}, activityMapping = {}, callMatched) => {
        const calls = normalizedCalls.map((call) => {
          const fromNumber = call.from && call.from.phoneNumber;
          const toNumber = call.to && call.to.phoneNumber;
          const fromMatches = (fromNumber && contactMapping[fromNumber]) || [];
          const toMatches = (toNumber && contactMapping[toNumber]) || [];
          const matched = callMatched[call.sessionId];
          return {
            ...call,
            fromMatches,
            toMatches,
            activityMatches: (activityMapping[call.sessionId]) || [],
            toNumberEntity: matched,
          };
        });
        return calls;
      }
    );

    this.addSelector('uniqueNumbers',
      this._selectors.normalizedCalls,
      (normalizedCalls) => {
        const output = [];
        const numberMap = {};
        function addIfNotExist(number) {
          if (!numberMap[number]) {
            output.push(number);
            numberMap[number] = true;
          }
        }
        normalizedCalls.forEach((call) => {
          if (call.from && call.from.phoneNumber) {
            addIfNotExist(call.from.phoneNumber);
          }
          if (call.to && call.to.phoneNumber) {
            addIfNotExist(call.to.phoneNumber);
          }
        });
        return output;
      }
    );

    if (this._contactMatcher) {
      this._contactMatcher.addQuerySource({
        getQueriesFn: this._selectors.uniqueNumbers,
        readyCheckFn: () => (
          this._accountInfo.ready &&
          this._detailedPresence.ready
        ),
      });
    }
    this.addSelector('sessionIds',
      () => this._detailedPresence.calls,
      calls => calls.map(call => call.sessionId)
    );
    if (this._activityMatcher) {
      this._activityMatcher.addQuerySource({
        getQueriesFn: this._selectors.sessionIds,
        readyCheckFn: () => this._detailedPresence.ready,
      });
    }

    this._lastProcessedNumbers = null;
    this._lastProcessedCalls = null;
    this._lastProcessedIds = null;
  }

  _onStateChange = async () => {
    if (
      this._call.ready &&
      this._accountInfo.ready &&
      this._detailedPresence.ready &&
      (!this._contactMatcher || this._contactMatcher.ready) &&
      (!this._activityMatcher || this._activityMatcher.ready) &&
      this._storage.ready &&
      this.pending
    ) {
      this.store.dispatch({
        type: this.actionTypes.init,
      });
      this.store.dispatch({
        type: this.actionTypes.initSuccess,
      });
    } else if (
      (
        !this._call.ready ||
        !this._accountInfo.ready ||
        !this._detailedPresence.ready ||
        (this._contactMatcher && !this._contactMatcher.ready) ||
        (this._activityMatcher && !this._activityMatcher.ready) ||
        !this._storage.ready
      ) &&
      this.ready
    ) {
      this.store.dispatch({
        type: this.actionTypes.reset,
      });
      this._lastProcessedCalls = null;
      this._lastProcessedIds = null;
      this._lastProcessedNumbers = null;
      this.store.dispatch({
        type: this.actionTypes.resetSuccess,
      });
    } else if (
      this.ready
    ) {
      const uniqueNumbers = this._selectors.uniqueNumbers();
      if (this._lastProcessedNumbers !== uniqueNumbers) {
        this._lastProcessedNumbers = uniqueNumbers;
        if (this._contactMatcher && this._contactMatcher.ready) {
          this._contactMatcher.triggerMatch();
        }
      }
      const sessionIds = this._selectors.sessionIds();
      if (this._lastProcessedIds !== sessionIds) {
        this._lastProcessedIds = sessionIds;
        if (this._activityMatcher && this._activityMatcher.ready) {
          this._activityMatcher.triggerMatch();
        }
      }

      if (
        this._lastProcessedCalls !== this.calls
      ) {
        const oldCalls = (
          this._lastProcessedCalls &&
          this._lastProcessedCalls.slice()
        ) || [];

        this._lastProcessedCalls = this.calls;

        // no ringing calls
        if (oldCalls.length !== 0 &&
            this.calls.length === 0 &&
            this._call.toNumberEntities &&
            this._call.toNumberEntities.length !== 0) {
          // console.log('no calls clean to number:');
          this._call.cleanToNumberEntities();
        }

        let entities = this._call.toNumberEntities.sort(sortByStartTime);
        // const matchedMap = {};
        this.calls.forEach((call) => {
          const oldCallIndex = oldCalls.findIndex(item => item.sessionId === call.sessionId);
          if (oldCallIndex === -1) {
            if (typeof this._onNewCall === 'function') {
              this._onNewCall(call);
            }
            if (typeof this._onRinging === 'function' && isRinging(call)) {
              this._onRinging(call);
            }
          } else {
            const oldCall = oldCalls[oldCallIndex];
            oldCalls.splice(oldCallIndex, 1);
            if (
              call.telephonyStatus !== oldCall.telephonyStatus &&
              typeof this._onCallUpdated === 'function'
            ) {
              this._onCallUpdated(call);
            }
          }
          entities.find((entity, index) => {
            const toEntity = call.toMatches.find(toMatch =>
              toMatch.id === entity.entityId
            );
            if (toEntity !== undefined) {
              entities = this._removeMatched(index, entities);
              this._setMatchedData({
                sessionId: call.sessionId,
                toEntityId: toEntity.id,
              });
              return true;
            }
            return false;
          });
        });

        oldCalls.forEach((call) => {
          if (typeof this._onCallEnded === 'function') {
            this._onCallEnded(call);
          }
        });
      }
    }
  }
  initialize() {
    this.store.subscribe(this._onStateChange);
  }

  _removeMatched(index, entities) {
    console.log('removeMatched:', index);
    entities.splice(index, 1);
    console.log('entities after splice:', entities);
    return entities;
  }

  _setMatchedData(matched) {
    this.store.dispatch({
      type: this.actionTypes.setData,
      ...matched,
    });
  }

  get hasRingingCalls() {
    return hasRingingCalls(this.calls);
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

  get calls() {
    return this._selectors.calls();
  }

  get callMatched() {
    return this._storage.getItem(this._callMatchedKey);
  }
}
