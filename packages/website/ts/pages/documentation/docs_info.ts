import compareVersions = require('compare-versions');
import * as _ from 'lodash';
import {
    DocAgnosticFormat,
    DocsInfoConfig,
    DocsMenu,
    DoxityDocObj,
    MenuSubsectionsBySection,
    SectionsMap,
    TypeDocNode,
} from 'ts/types';

export class DocsInfo {
    public displayName: string;
    public packageUrl: string;
    public subPackageName?: string;
    public websitePath: string;
    public docsJsonRoot: string;
    public menu: DocsMenu;
    public sections: SectionsMap;
    public sectionNameToMarkdown: {[sectionName: string]: string};
    private _docsInfo: DocsInfoConfig;
    constructor(config: DocsInfoConfig) {
        this.displayName = config.displayName;
        this.packageUrl = config.packageUrl;
        this.subPackageName = config.subPackageName;
        this.websitePath = config.websitePath;
        this.docsJsonRoot = config.docsJsonRoot;
        this.sections = config.sections;
        this.sectionNameToMarkdown = config.sectionNameToMarkdown;
        this._docsInfo = config;
    }
    public isPublicType(typeName: string): boolean {
        if (_.isUndefined(this._docsInfo.publicTypes)) {
            return false;
        }
        const isPublic = _.includes(this._docsInfo.publicTypes, typeName);
        return isPublic;
    }
    public getModulePathsIfExists(sectionName: string): string[] {
        const modulePathsIfExists = this._docsInfo.sectionNameToModulePath[sectionName];
        return modulePathsIfExists;
    }
    public getMenu(selectedVersion?: string): {[section: string]: string[]} {
        if (_.isUndefined(selectedVersion) || _.isUndefined(this._docsInfo.menuSubsectionToVersionWhenIntroduced)) {
            return this._docsInfo.menu;
        }

        const finalMenu = _.cloneDeep(this._docsInfo.menu);
        if (_.isUndefined(finalMenu.contracts)) {
            return finalMenu;
        }

        // TODO: refactor to include more sections then simply the `contracts` section
        finalMenu.contracts = _.filter(finalMenu.contracts, (contractName: string) => {
            const versionIntroducedIfExists = this._docsInfo.menuSubsectionToVersionWhenIntroduced[contractName];
            if (!_.isUndefined(versionIntroducedIfExists)) {
                const existsInSelectedVersion = compareVersions(selectedVersion,
                                                                versionIntroducedIfExists) >= 0;
                return existsInSelectedVersion;
            } else {
                return true;
            }
        });
        return finalMenu;
    }
    public getMenuSubsectionsBySection(docAgnosticFormat?: DocAgnosticFormat): MenuSubsectionsBySection {
        const menuSubsectionsBySection = {} as MenuSubsectionsBySection;
        if (_.isUndefined(docAgnosticFormat)) {
            return menuSubsectionsBySection;
        }

        const docSections = _.keys(this.sections);
        _.each(docSections, sectionName => {
            const docSection = docAgnosticFormat[sectionName];
            if (_.isUndefined(docSection)) {
                return; // no-op
            }

            if (!_.isUndefined(this.sections.types) && sectionName === this.sections.types) {
                const sortedTypesNames = _.sortBy(docSection.types, 'name');
                const typeNames = _.map(sortedTypesNames, t => t.name);
                menuSubsectionsBySection[sectionName] = typeNames;
            } else {
                let eventNames: string[] = [];
                if (!_.isUndefined(docSection.events)) {
                    const sortedEventNames = _.sortBy(docSection.events, 'name');
                    eventNames = _.map(sortedEventNames, m => m.name);
                }
                const sortedMethodNames = _.sortBy(docSection.methods, 'name');
                const methodNames = _.map(sortedMethodNames, m => m.name);
                menuSubsectionsBySection[sectionName] = [...methodNames, ...eventNames];
            }
        });
        return menuSubsectionsBySection;
    }
    public getTypeDefinitionsByName(docAgnosticFormat: DocAgnosticFormat) {
        if (_.isUndefined(this.sections.types)) {
            return {};
        }

        const typeDocSection = docAgnosticFormat[this.sections.types];
        const typeDefinitionByName = _.keyBy(typeDocSection.types, 'name');
        return typeDefinitionByName;
    }
    public isVisibleConstructor(sectionName: string): boolean {
        return _.includes(this._docsInfo.visibleConstructors, sectionName);
    }
    public convertToDocAgnosticFormat(docObj: DoxityDocObj|TypeDocNode): DocAgnosticFormat {
        return this._docsInfo.convertToDocAgnosticFormatFn(docObj, this);
    }
}
