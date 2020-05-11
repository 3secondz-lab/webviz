// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { groupBy, keyBy, sortBy, mapValues } from "lodash";
import * as React from "react";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";

import Button from "webviz-core/src/components/Button";
import Dropdown from "webviz-core/src/components/Dropdown";
import Flex from "webviz-core/src/components/Flex";
import { Item } from "webviz-core/src/components/Menu";
// import MessageHistoryDEPRECATED from "webviz-core/src/components/MessageHistoryDEPRECATED";
// import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import TextContent from "webviz-core/src/components/TextContent";
import filterMap from "webviz-core/src/filterMap";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import type { Topic, Message, SubscribePayload, AdvertisePayload } from "webviz-core/src/players/types";
import { downloadTextFile } from "webviz-core/src/util";

const { useCallback } = React;

// const RECORD_ALL = "RECORD_ALL";

const Container = styled.div`
  padding: 16px;
  overflow-y: auto;
  ul {
    font-size: 10px;
    margin-left: 8px;
  }
  li {
    margin: 4px 0;
  }
  h1 {
    font-size: 1.5em;
    margin-bottom: 0.5em;
  }
  section {
    flex: 1 1 50%;
    overflow: hidden;
  }
`;

function Terminal(props) {
  return (
    <Container>
      <PanelToolbar floating />
      <p>This is Empty Panel</p>
    </Container>
  );
}

Terminal.panelType = "Terminal";
Terminal.defaultConfig = {};

export default hot(Panel<{}>(Terminal));
