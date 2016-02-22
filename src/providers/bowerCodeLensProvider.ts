/* --------------------------------------------------------------------------------------------
 * Copyright (c) Peter Flannery. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
const bower = require('bower');

import {
CodeLensProvider,
CancellationToken,
CodeLens,
TextDocument
} from 'vscode';

import {PackageCodeLens} from '../models/packageCodeLens';
import {AppConfiguration} from '../models/appConfiguration';
import {AbstractCodeLensProvider} from './abstractCodeLensProvider';
import {PackageCodeLensList} from '../lists/packageCodeLensList'

export class BowerCodeLensProvider extends AbstractCodeLensProvider implements CodeLensProvider {

  private packageDependencyKeys: string[] = ['dependencies', 'devDependencies'];

  constructor(appConfig: AppConfiguration) {
    super(appConfig);
  }

  provideCodeLenses(document: TextDocument, token: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {
    const jsonDoc = this.jsonService.parseJson(document.getText());
    const collector: PackageCodeLensList = new PackageCodeLensList(document);

    jsonDoc.root.getChildNodes().forEach((node) => {
      if (this.packageDependencyKeys.indexOf(node.key.value) !== -1)
        collector.addRange(node.value.getChildNodes());
    });

    return collector.list;
  }

  resolveCodeLens(codeLensItem: CodeLens, token: CancellationToken): Thenable<CodeLens> {
    if (codeLensItem instanceof PackageCodeLens) {
      if (codeLensItem.packageVersion === 'latest') {
        this.makeLatestCommand(codeLensItem);
        return;
      }

      return new Promise<CodeLens>((success) => {
        bower.commands.info(codeLensItem.packageName)
          .on('end', (info) => {
            if (!info || !info.latest)
              success(this.makeErrorCommand(-1, "Invalid object returned from server", codeLensItem));

            success(this.makeVersionCommand(codeLensItem.packageVersion, info.latest.version, codeLensItem));
          })
          .on('error', (err) => {
            success(this.makeErrorCommand(-1, err.message, codeLensItem));
          });
      });

    }
  }

}