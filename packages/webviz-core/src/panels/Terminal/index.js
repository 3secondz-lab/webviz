// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// import { groupBy, keyBy, sortBy, mapValues } from "lodash";
import * as React from "react";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";
// import { Term } from "@dash4/react-xterm";
// import "@dash4/react-xterm/lib/ReactXterm.css";
import XTerm, { Terminal } from "react-xterm";
import "xterm/css/xterm.css";

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

function TerminalWrap({ id }: { id: String }) {
  // const [term, setTerm] = React.useState<Term | undefined>(undefined);

  // function handleTermRef(uid: String, xterm: Term) {
  //   setTerm(xterm);
  // }

  // function handleStart() {
  //   term.write("npm start");
  // }

  function runFakeTerminal(xterm: XTerm) {
    const term: Terminal = xterm.getTerminal();
    var shellprompt = "$ ";

    function prompt() {
      xterm.write("\r\n" + shellprompt);
    }
    xterm.writeln("Welcome to xterm.js");
    xterm.writeln("This is a local terminal emulation, without a real terminal in the back-end.");
    xterm.writeln("Type some keys and commands to play around.");
    xterm.writeln("");
    prompt();

    term.on("key", function(key, ev) {
      var printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

      if (ev.keyCode == 13) {
        prompt();
        // } else if (ev.keyCode == 8) {
        //   // Do not delete the prompt
        //   if (term['x'] > 2) {
        //     xterm.write('\b \b');
        //   }
      } else if (printable) {
        xterm.write(key);
      }
    });

    term.on("paste", function(data, ev) {
      xterm.write(data);
    });
  }

  const inputRef = React.createRef();

  React.useEffect(() => {
    runFakeTerminal(inputRef.current);
  }, []);

  return (
    <Container>
      <PanelToolbar floating />
      {/* <Term ref_={handleTermRef} uid={id} />
      <button onClick={handleStart}>start</button> */}
      <XTerm
        ref={inputRef}
        addons={["fit", "fullscreen", "search"]}
        style={{
          overflow: "hidden",
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      />
    </Container>
  );
}

TerminalWrap.panelType = "TerminalWrap";
TerminalWrap.defaultConfig = {};

export default hot(Panel<{}>(TerminalWrap));
