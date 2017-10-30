// imports
import { find } from 'lodash';

// local imports
import { loadEvents, saveEvent } from '../../../../lib/events-store';
import { createOrderedId, createId } from '../../../../lib/uuid';
import { event_type, order_status, master_pub_key } from '../../../../model/consts';
import getTickers from './get-tickers';
import { generatePaymentAddress } from './generate-address';


export function computeAmountOfTokens(amount) {
  // TODO
  return parseInt(amount) * 16
}

export default async (userId, orderInput) => {
  return loadEvents(userId)
    .then(events => {
      return find(events, { type: event_type.account_created });
    })
    .then(account_created => {
      return getTickers()
        .then(tickers => ({
          account_created,
          tickers
        }));
    })
    .then(pair => {
      const account = pair.account_created;
      if (account && account.data && account.data.coin) {
        return generatePaymentAddress(userId, account.data.coin).then(paymentAddress => {
          const coin = account.data.coin;
          const spotPrice = pair.tickers[coin];
          const amountOfTokens = computeAmountOfTokens(orderInput.usdAmount);
          const payload = {
            user_id: userId,
            event_id: createOrderedId(),
            invoice_id: createId(),
            type: event_type.order_created,
            timestamp: new Date().toISOString(),
            data: {
              ethereum_return_address: orderInput.ethereumReturnAddress,
              usd_amount: orderInput.usdAmount,
              spot_price: spotPrice,
              coin: coin,
              payment_address: paymentAddress,
              amount_of_tokens: amountOfTokens,
            },
          };
          return saveEvent(payload)
            .then(() => ({
              invoiceId: payload.invoice_id,
              amountOfTokens: payload.data.amount_of_tokens,
              usdAmount: payload.data.usd_amount,
              ethereumReturnAddress: payload.data.ethereum_return_address,
              coin: coin,
              spotPrice: spotPrice,
              paymentAddress: paymentAddress,
            }));
        });
      }
      return null;
    });
};
