import './styles/main.css';

import { registerDecoder } from 'mediabunny';

import { OpaqueVpxDecoder } from './input/OpaqueVpxDecoder';
import { browserDeps } from './ui/browserDeps';
import { startApp } from './ui/startApp';

registerDecoder(OpaqueVpxDecoder);
startApp(browserDeps(window));
