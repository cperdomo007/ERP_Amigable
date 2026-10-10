import Decimal from 'decimal.js';
Decimal.set({precision:40,rounding:Decimal.ROUND_HALF_UP});
export const decimal=v=>new Decimal(v===undefined||v===''?0:v);
export function moneyRound(v){try{const value=decimal(v).toDecimalPlaces(2);return value.abs().lte('1000000000000')?value.toNumber():NaN}catch{return NaN}}
export const sumMoney=values=>moneyRound(values.reduce((sum,v)=>sum.plus(v),decimal(0)));
export function quantityRound(v){try{return decimal(v).toDecimalPlaces(6).toNumber()}catch{return NaN}}
export const sumQuantity=values=>quantityRound(values.reduce((sum,v)=>sum.plus(v),decimal(0)));
export function lineAmounts(l){const gross=decimal(l.qty).times(l.price),net=gross.times(decimal(1).minus(decimal(l.discount||0).div(100))).toDecimalPlaces(2);return {subtotal:moneyRound(gross),net:net.toNumber(),tax:moneyRound(net.times(l.taxRate||0).div(100))}}
export function documentAmounts(lines){const amounts=lines.map(lineAmounts),subtotal=sumMoney(amounts.map(l=>l.subtotal)),net=sumMoney(amounts.map(l=>l.net)),tax=sumMoney(amounts.map(l=>l.tax));return {subtotal,net,tax,total:moneyRound(decimal(net).plus(tax)),discountTotal:moneyRound(decimal(subtotal).minus(net))}}
export function convertMoney(amount,from,to,rate){if(from===to)return moneyRound(amount);if(!['USD','VES'].includes(from)||!['USD','VES'].includes(to)||!decimal(rate).isPositive())throw Error('Moneda o tasa inválida.');return moneyRound(from==='USD'?decimal(amount).times(rate):decimal(amount).div(rate))}
