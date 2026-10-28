import React from 'react';
import type {Connection} from '../shared/connection';
import {countryName} from '../shared/countries';
// Offline SVGs work on Windows, unlike regional-indicator emoji. No network/CDN.
const flags=import.meta.glob('./flags/*.svg',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export function CountryLabel({code}:{code:string}){
 const src=flags[`./flags/${code}.svg`];const name=countryName(code);
 return <span className="country-label">{src&&<img className="country-flag" src={src} alt={`${name} flag`} width="22" height="15"/>}<span>{name} ({code})</span></span>;
}
// A proxy can be shared by profiles with different requested countries. Compare
// the observed exit to this profile, not the last tester's requested country.
export function profileConnection(connection:Connection|null|undefined,requestedCountry:string|null):Connection|null{
 if(!connection)return null;
 if(['connected','location-mismatch'].includes(connection.state)&&connection.ip&&connection.country){
  const mismatch=!!requestedCountry&&requestedCountry!==connection.country;
  return {...connection,requestedCountry,state:mismatch?'location-mismatch':'connected',message:mismatch?`Observed exit ${countryName(connection.country)} (${connection.country}) does not match requested ${countryName(requestedCountry!)} (${requestedCountry}). Retry or replace the endpoint.`:'Latest actual location probe succeeded for this profile. IP location is approximate, not GPS or leak certification.'};
 }
 return {...connection,requestedCountry};
}
export function ProfileLocation({requestedCountry,proxyId,connection}:{requestedCountry:string|null;proxyId:string|null;connection:Connection|null|undefined}){
 const verified=!!proxyId&&!!connection?.ip&&!!connection.country&&['connected','location-mismatch'].includes(connection.state);
 return <div className="profile-location"><small>Requested: {requestedCountry?<CountryLabel code={requestedCountry}/>: 'None'}</small><small>Verified exit (last test): {verified?<CountryLabel code={connection!.country!}/>: 'No verified proxy location'}</small>{!proxyId&&<small>Direct connection</small>}{verified&&<small title={connection!.checkedAt}>Checked {new Date(connection!.checkedAt).toLocaleString()}</small>}</div>;
}
