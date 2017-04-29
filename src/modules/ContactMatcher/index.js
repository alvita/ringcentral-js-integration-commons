import DataMatcher from '../../lib/DataMatcher';

export default class ContactMatcher extends DataMatcher {
  constructor({
    ...options
  }) {
    super({
      name: 'contactMatcher',
      ...options
    });
  }

  async hasMatchNumber({ phoneNumber }) {
    await this.forceMatchNumber({ phoneNumber });
    console.debug(this.dataMapping);
    const contactMatchers = this.dataMapping[phoneNumber] || [];
    return contactMatchers.length > 0;
  }

  async forceMatchNumber({ phoneNumber }) {
    await this.match({
      queries: [phoneNumber],
      ignoreCache: true
    });
  }
}
