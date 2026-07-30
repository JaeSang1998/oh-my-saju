import type { ElectionRequest, ElectionResult } from './election';
import type { IChingReport, IChingRequest } from './iching';
import type { LiurenReport, LiurenRequest } from './liuren';
import type { Tojeong144Report, Tojeong144Request } from './tojeong';
import type { ZiweiReport, ZiweiRequest } from './ziwei';

export type TraditionalSystemRequest =
  | ElectionRequest
  | Tojeong144Request
  | IChingRequest
  | ZiweiRequest
  | LiurenRequest;

export type TraditionalSystemResult =
  | ElectionResult
  | Tojeong144Report
  | IChingReport
  | ZiweiReport
  | LiurenReport;
